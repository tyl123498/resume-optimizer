const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface CreateOrderResponse {
  order_id: string
  qr_url: string
  access_token: string
  amount: number
}

export interface OrderStatusResponse {
  order_id: string
  status: string
}

export interface OptimizeResponse {
  match_score: number
  missing_keywords: string[]
  improvement_tips: string[]
  optimized_resume: string
}

export interface ApiError {
  code: string
  detail: string
}

export async function createOrder(
  resumeText: string,
  jdText: string,
  isTest = false
): Promise<CreateOrderResponse> {
  const res = await fetch(API_URL + "/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resume_text: resumeText,
      jd_text: jdText,
      is_test: isTest,
    }),
  })
  if (!res.ok) {
    const err: ApiError = await res.json()
    throw new Error(err.detail || "创建订单失败")
  }
  return res.json()
}

export async function getOrderStatus(
  orderId: string
): Promise<OrderStatusResponse> {
  const res = await fetch(API_URL + "/api/orders/" + orderId)
  if (!res.ok) throw new Error("查询订单状态失败")
  return res.json()
}

export async function runOptimization(
  orderId: string,
  accessToken: string
): Promise<OptimizeResponse> {
  const res = await fetch(API_URL + "/api/optimize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: orderId, access_token: accessToken }),
  })
  if (!res.ok) {
    const err: ApiError = await res.json()
    throw new Error(err.detail || "优化失败")
  }
  return res.json()
}

export async function getResult(
  orderId: string,
  token: string
): Promise<OptimizeResponse | null> {
  const res = await fetch(
    API_URL + "/api/orders/" + orderId + "/result?token=" + token
  )
  if (!res.ok) return null
  const data = await res.json()
  if (!data.analysis_result) return null
  return {
    ...data.analysis_result,
    optimized_resume: data.generate_result,
  }
}
