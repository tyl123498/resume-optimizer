import hashlib
import hmac
import time as _time
import os as _os
import httpx
from logger import log_event

APP_ID = _os.environ.get('HUPIJIAO_APP_ID', '')
APP_SECRET = _os.environ.get('HUPIJIAO_APP_SECRET', '')
NOTIFY_URL = _os.environ.get('HUPIJIAO_NOTIFY_URL', '')
HUPIJIAO_API_URL = 'https://api.xunhupay.com/payment/do.html'

def _sign(params):
    items = sorted((k, v) for k, v in params.items() if v and k not in ('sign', 'hash'))
    raw = '&'.join(f'{k}={v}' for k, v in items) + APP_SECRET
    return hashlib.md5(raw.encode('utf-8')).hexdigest()

def verify_signature(params):
    sign = (params.get('sign') or params.get('hash') or '').lower()
    if not sign:
        return False
    return hmac.compare_digest(sign, _sign(params).lower())

async def create_payment_order(order_id):
    if not APP_ID or not APP_SECRET:
        log_event('hupijiao_not_configured', order_id=order_id)
        return None
    p = {
        'version': '1.0', 'app_id': APP_ID,
        'trade_order_id': order_id, 'total_fee': '990',
        'title': 'AI简历优化服务',
        'time': str(int(_time.time())), 'notify_url': NOTIFY_URL,
        'nonce_str': hashlib.md5(str(_time.time()).encode()).hexdigest()[:16],
    }
    p['hash'] = _sign(p)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(HUPIJIAO_API_URL, data=p)
            j = r.json()
            if j.get('errcode') == 0:
                log_event('hupijiao_order_created', order_id=order_id, hupijiao_order_id=j.get('order_id'))
                return {'url_qr': j.get('url_qr', ''), 'order_id': j.get('order_id', '')}
            log_event('hupijiao_create_failed', order_id=order_id, error=j.get('errmsg', 'unknown'))
            return None
    except Exception as e:
        log_event('hupijiao_http_error', order_id=order_id, error=str(e))
        return None
