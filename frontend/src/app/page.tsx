"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2, QrCode, CheckCircle, AlertCircle, FileText, BarChart3, Download, ArrowLeft } from "lucide-react"
import ReactMarkdown from "react-markdown"
import {
  createOrder,
  getOrderStatus,
  runOptimization,
  getResult,
  type OptimizeResponse,
} from "@/lib/api"

type Step = "input" | "payment" | "loading" | "result"

export default function Home() {
  const [step, setStep] = useState<Step>("input")
  const [resumeText, setResumeText] = useState("")
  const [jdText, setJdText] = useState("")
  const [orderId, setOrderId] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [qrUrl, setQrUrl] = useState("")
  const [result, setResult] = useState<OptimizeResponse | null>(null)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"analysis" | "resume">("analysis")
  const [pollCount, setPollCount] = useState(0)
  const [editableResume, setEditableResume] = useState("")
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Result recovery on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oid = params.get("oid")
    const tk = params.get("tk")
    if (oid && tk) {
      const saved = sessionStorage.getItem("result_" + oid)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setResult(parsed)
          setEditableResume(parsed.optimized_resume || "")
          setStep("result")
          // Clean URL
          window.history.replaceState({}, "", "/")
          return
        } catch {}
      }
      // Try backend
      getResult(oid, tk).then((r) => {
        if (r) {
          setResult(r)
          setEditableResume(r.optimized_resume || "")
          setStep("result")
          sessionStorage.setItem("result_" + oid, JSON.stringify(r))
          window.history.replaceState({}, "", "/")
        }
      })
    }
  }, [])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  const startPayment = useCallback(async () => {
    const trimmedResume = resumeText.trim()
    const trimmedJd = jdText.trim()

    if (trimmedResume.length < 50) {
      setError("简历内容至少 50 个字符")
      return
    }
    if (trimmedResume.length > 8000) {
      setError("简历内容不能超过 8000 个字符")
      return
    }
    if (trimmedJd.length < 20) {
      setError("职位描述至少 20 个字符")
      return
    }
    if (trimmedJd.length > 4000) {
      setError("职位描述不能超过 4000 个字符")
      return
    }

    setError("")
    setStep("payment")
    setPollCount(0)

    try {
      const order = await createOrder(trimmedResume, trimmedJd)
      setOrderId(order.order_id)
      setAccessToken(order.access_token)
      setQrUrl(order.qr_url)

      if (!order.qr_url) {
        setError("支付服务暂时不可用，请稍后再试")
        setStep("input")
        return
      }

      // Start polling with exponential backoff
      let attempt = 0
      pollingRef.current = setInterval(async () => {
        attempt++
        setPollCount(attempt)
        try {
          const status = await getOrderStatus(order.order_id)
          if (status.status === "paid") {
            if (pollingRef.current) clearInterval(pollingRef.current)
            setStep("loading")
            await runOptimize(order.order_id, order.access_token)
          } else if (status.status === "expired") {
            if (pollingRef.current) clearInterval(pollingRef.current)
            setError("二维码已过期，请重新开始")
            setStep("input")
          }
        } catch {
          // Continue polling on transient errors
        }
      }, getPollInterval(attempt))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "创建订单失败"
      setError(msg)
      setStep("input")
    }
  }, [resumeText, jdText])

  const runOptimize = async (oid: string, token: string) => {
    try {
      const r = await runOptimization(oid, token)
      setResult(r)
      setEditableResume(r.optimized_resume)
      setStep("result")
      // Save to sessionStorage + update URL
      sessionStorage.setItem("result_" + oid, JSON.stringify(r))
      window.history.replaceState(
        {},
        "",
        "/?oid=" + encodeURIComponent(oid) + "&tk=" + encodeURIComponent(token)
      )
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "优化失败"
      setError(msg + "，请重试（您无需重新付费）")
      setStep("input")
    }
  }

  const handleExportPDF = () => {
    const content = editableResume || result?.optimized_resume || ""
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>优化简历</title>
        <style>
          body { font-family: 'Microsoft YaHei', Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #333; }
          h1 { font-size: 24px; border-bottom: 2px solid #333; padding-bottom: 8px; }
          h2 { font-size: 18px; margin-top: 24px; color: #1a1a1a; }
          h3 { font-size: 16px; margin-top: 20px; }
          ul { padding-left: 20px; }
          li { margin-bottom: 4px; }
          @media print { body { margin: 0; padding: 40px; } }
        </style></head><body>${content.replace(/\n/g, "<br>")}</body></html>
      `)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => printWindow.print(), 500)
    }
  }

  const resetAll = () => {
    setStep("input")
    setResult(null)
    setOrderId("")
    setAccessToken("")
    setQrUrl("")
    setError("")
    setActiveTab("analysis")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span className="font-bold text-gray-900">AI简历优化专家</span>
          </div>
          {step === "result" && (
            <button
              onClick={resetAll}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
              新建优化
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        {/* Hero */}
        {step === "input" && (
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              AI 简历优化专家
            </h1>
            <p className="mt-2 text-sm text-gray-500 sm:text-base">
              粘贴简历 + 目标职位描述 · AI 自动匹配分析 · 生成优化版简历
            </p>
            <div className="mx-auto mt-4 flex max-w-md items-center justify-center gap-6 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <BarChart3 className="h-3.5 w-3.5" /> 匹配分析
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> 优化简历
              </span>
              <span className="flex items-center gap-1">
                <Download className="h-3.5 w-3.5" /> 导出 PDF
              </span>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Input */}
        {step === "input" && (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  简历内容
                </label>
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="粘贴你的简历内容（至少 50 个字符）..."
                  className="h-64 w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  maxLength={8000}
                />
                <p className="mt-1 text-right text-xs text-gray-400">
                  {resumeText.length}/8000
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  职位描述
                </label>
                <textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="粘贴目标职位的描述（至少 20 个字符）..."
                  className="h-64 w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  maxLength={4000}
                />
                <p className="mt-1 text-right text-xs text-gray-400">
                  {jdText.length}/4000
                </p>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={startPayment}
                disabled={!resumeText.trim() || !jdText.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3 text-base font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <QrCode className="h-5 w-5" />
                开始优化 · ¥9.9
              </button>
              <p className="mt-2 text-xs text-gray-400">
                一次支付同时获得匹配分析 + 优化简历
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Payment QR Modal */}
        {step === "payment" && (
          <div className="mx-auto max-w-sm">
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <div className="mb-4">
                <span className="text-2xl font-bold text-gray-900">
                  ¥9.90
                </span>
              </div>
              {qrUrl ? (
                <div className="mx-auto mb-4 h-48 w-48">
                  <img
                    src={qrUrl}
                    alt="支付二维码"
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="mx-auto mb-4 flex h-48 w-48 items-center justify-center rounded-lg bg-gray-100">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              )}
              <p className="mb-1 text-sm font-medium text-gray-700">
                请使用微信或支付宝扫码支付
              </p>
              <p className="mb-4 text-xs text-gray-400">
                支付完成后将自动开始优化
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                等待支付中{". ".repeat(Math.min(pollCount, 3))}
              </div>
              <button
                onClick={() => {
                  if (pollingRef.current) clearInterval(pollingRef.current)
                  setStep("input")
                }}
                className="mt-4 text-xs text-gray-400 hover:text-gray-600 underline"
              >
                取消支付
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Loading */}
        {step === "loading" && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="mt-4 text-base font-medium text-gray-700">
              AI 正在优化你的简历...
            </p>
            <p className="mt-1 text-sm text-gray-400">
              分析匹配度 + 生成优化版本，大约需要 10-20 秒
            </p>
          </div>
        )}

        {/* Step 4: Results */}
        {step === "result" && result && (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
              <button
                onClick={() => setActiveTab("analysis")}
                className={
                  "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors " +
                  (activeTab === "analysis"
                    ? "bg-blue-600 text-white"
                    : "text-gray-500 hover:text-gray-700")
                }
              >
                <BarChart3 className="h-4 w-4" />
                匹配分析
              </button>
              <button
                onClick={() => setActiveTab("resume")}
                className={
                  "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors " +
                  (activeTab === "resume"
                    ? "bg-blue-600 text-white"
                    : "text-gray-500 hover:text-gray-700")
                }
              >
                <FileText className="h-4 w-4" />
                优化简历
              </button>
            </div>

            {/* Tab: Analysis */}
            {activeTab === "analysis" && (
              <div className="space-y-4">
                {/* Match Score */}
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">
                    匹配得分
                  </h3>
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        "text-3xl font-bold " +
                        (result.match_score >= 70
                          ? "text-green-600"
                          : result.match_score >= 40
                          ? "text-amber-600"
                          : "text-red-600")
                      }
                    >
                      {result.match_score}%
                    </span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={
                          "h-full rounded-full transition-all " +
                          (result.match_score >= 70
                            ? "bg-green-500"
                            : result.match_score >= 40
                            ? "bg-amber-500"
                            : "bg-red-500")
                        }
                        style={{ width: result.match_score + "%" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Missing Keywords */}
                {result.missing_keywords &&
                  result.missing_keywords.length > 0 && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                      <h3 className="mb-3 text-sm font-semibold text-gray-900">
                        缺失关键词
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {result.missing_keywords.map(
                          (kw: string, i: number) => (
                            <span
                              key={i}
                              className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-200"
                            >
                              {kw}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* Improvement Tips */}
                {result.improvement_tips &&
                  result.improvement_tips.length > 0 && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                      <h3 className="mb-3 text-sm font-semibold text-gray-900">
                        改进建议
                      </h3>
                      <ul className="space-y-3">
                        {result.improvement_tips.map(
                          (tip: string, i: number) => (
                            <li
                              key={i}
                              className="flex gap-3 text-sm text-gray-700"
                            >
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                                {i + 1}
                              </span>
                              <span>{tip}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
              </div>
            )}

            {/* Tab: Optimized Resume */}
            {activeTab === "resume" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    优化简历
                  </h3>
                  <button
                    onClick={handleExportPDF}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    导出 PDF
                  </button>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white">
                  <div className="border-b border-gray-100 px-4 py-2">
                    <span className="text-xs text-gray-400">
                      点击下方内容可编辑
                    </span>
                  </div>
                  <div className="p-4">
                    <textarea
                      value={editableResume}
                      onChange={(e) => setEditableResume(e.target.value)}
                      className="mb-4 h-64 w-full resize-y rounded border border-gray-200 p-3 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <div className="prose prose-sm max-w-none rounded-lg bg-gray-50 p-4">
                      <ReactMarkdown>{editableResume}</ReactMarkdown>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                  <p>
                    此页面包含您的专属访问密钥，请勿分享链接。
                    结果已保存在本地，如清除浏览器缓存将无法找回，建议及时导出。
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function getPollInterval(attempt: number): number {
  // Exponential backoff: 2s, 3s, 5s, 10s (max)
  if (attempt < 1) return 2000
  if (attempt < 3) return 3000
  if (attempt < 6) return 5000
  return 10000
}
