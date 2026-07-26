import os, uuid, secrets, json
from datetime import datetime

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from schemas import (
    CreateOrderRequest, CreateOrderResponse, OrderStatusResponse,
    OptimizeRequest, OptimizeResponse, ResultResponse, APIError,
)
from chains import analyze_resume, generate_resume
from database import (
    init_db, create_order, get_order, update_order_paid,
    mark_order_used, save_results, is_order_valid, get_result, get_conn,
)
from payment import create_payment_order, verify_signature
from rate_limiter import limiter
from logger import setup_logging, log_event

# === Setup ===
setup_logging()
init_db()

# === CORS ===
ALLOWED_ORIGINS = os.environ.get(
    'ALLOWED_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000'
).split(',')

app = FastAPI(title='AI Resume Optimizer API (Paid)', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS if o.strip()],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


# === Helpers ===

def _real_ip(request: Request) -> str:
    forwarded = request.headers.get('x-forwarded-for')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.client.host if request.client else 'unknown'


def _err(code: str, detail: str, status: int = 400):
    return HTTPException(status_code=status, detail=APIError(code=code, detail=detail).model_dump())


# === Routes ===

@app.get('/health')
async def health():
    return {'status': 'ok', 'service': 'resume-optimizer-api-paid'}


@app.post('/api/orders', response_model=CreateOrderResponse,
          responses={400: {'model': APIError}, 429: {'model': APIError}})
async def create_order_route(req: CreateOrderRequest, request: Request):
    ip = _real_ip(request)
    if not limiter.check(ip, limit=10, window_seconds=3600):
        raise _err('RATE_LIMITED', '请求过于频繁，请稍后再试', 429)

    order_id = str(uuid.uuid4())
    access_token = secrets.token_urlsafe(32)

    create_order(order_id, access_token, req.resume_text, req.jd_text,
                 is_test=1 if req.is_test else 0)
    log_event('order_created', order_id=order_id, is_test=req.is_test)

    payment = await create_payment_order(order_id)
    if payment is None:
        log_event('order_no_payment_gateway', order_id=order_id)
        return CreateOrderResponse(
            order_id=order_id, qr_url='',
            access_token=access_token, amount=990,
        )

    conn = get_conn()
    conn.execute(
        "UPDATE payment_orders SET hupijiao_order_id = ? WHERE id = ?",
        (payment.get('order_id', ''), order_id)
    )
    conn.commit()

    return CreateOrderResponse(
        order_id=order_id, qr_url=payment.get('url_qr', ''),
        access_token=access_token, amount=990,
    )


@app.get('/api/orders/{order_id}', response_model=OrderStatusResponse,
         responses={404: {'model': APIError}})
async def get_order_status(order_id: str):
    order = get_order(order_id)
    if not order:
        raise _err('ORDER_NOT_FOUND', '订单不存在', 404)

    status = order['status']
    if status == 'pending' and order.get('expired_at'):
        try:
            expired = datetime.fromisoformat(order['expired_at'])
            if datetime.now() > expired:
                status = 'expired'
        except (ValueError, TypeError):
            pass

    return OrderStatusResponse(order_id=order_id, status=status)


@app.post('/api/payment/callback')
async def payment_callback(request: Request):
    form = await request.form()
    params = dict(form)
    log_event('payment_callback_received',
              hupijiao_order_id=params.get('trade_order_id', ''))

    if not verify_signature(params):
        log_event('payment_callback_invalid_signature',
                  hupijiao_order_id=params.get('trade_order_id', ''))
        return {'error': 'invalid signature'}

    trade_order_id = params.get('trade_order_id', '')
    hupijiao_order_id = params.get('order_id', '')
    if not trade_order_id:
        return {'error': 'missing trade_order_id'}

    update_order_paid(trade_order_id, hupijiao_order_id)
    log_event('payment_callback_processed',
              order_id=trade_order_id,
              hupijiao_order_id=hupijiao_order_id)
    return 'success'


@app.post('/api/optimize', response_model=OptimizeResponse,
          responses={403: {'model': APIError}, 409: {'model': APIError}})
async def optimize(req: OptimizeRequest, request: Request):
    ip = _real_ip(request)
    limiter.check(ip, limit=5, window_seconds=60)

    order = get_order(req.order_id)
    if not order:
        raise _err('ORDER_NOT_FOUND', '订单不存在', 404)

    if not is_order_valid(req.order_id, req.access_token):
        if order['status'] == 'used':
            raise _err('ORDER_ALREADY_USED', '该订单已被使用', 409)
        raise _err('INVALID_TOKEN', '订单验证失败', 403)

    try:
        analysis = await analyze_resume(order['resume_text'], order['jd_text'])
        generation = await generate_resume(order['resume_text'], order['jd_text'])
    except Exception as e:
        log_event('optimize_llm_failed', order_id=req.order_id, error=str(e))
        raise _err('LLM_ERROR', 'AI服务暂时不可用，请稍后重试。您无需重新付费。', 500)

    analysis_json = json.dumps({
        'match_score': analysis.match_score,
        'missing_keywords': analysis.missing_keywords,
        'improvement_tips': analysis.improvement_tips,
    })
    save_results(req.order_id, analysis_json, generation.optimized_resume)
    mark_order_used(req.order_id)

    log_event('optimize_completed', order_id=req.order_id)
    return OptimizeResponse(
        match_score=analysis.match_score,
        missing_keywords=analysis.missing_keywords,
        improvement_tips=analysis.improvement_tips,
        optimized_resume=generation.optimized_resume,
    )


@app.get('/api/orders/{order_id}/result', response_model=ResultResponse,
         responses={403: {'model': APIError}, 404: {'model': APIError}})
async def get_order_result(order_id: str, request: Request):
    token = request.query_params.get('token', '')
    if not token:
        raise _err('MISSING_TOKEN', '缺少访问令牌', 400)
    result = get_result(order_id, token)
    if not result:
        raise _err('NOT_FOUND_OR_INVALID', '结果不存在或访问令牌无效', 404)
    analysis = json.loads(result['analysis_result']) if result.get('analysis_result') else None
    return ResultResponse(
        analysis_result=analysis,
        generate_result=result.get('generate_result'),
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log_event('unhandled_error', path=request.url.path, error=str(exc)[:200])
    return JSONResponse(
        status_code=500,
        content=APIError(code='INTERNAL_ERROR', detail='服务器内部错误').model_dump()
    )


if __name__ == '__main__':
    import uvicorn
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', '8000'))
    uvicorn.run('main:app', host=host, port=port, reload=True)

