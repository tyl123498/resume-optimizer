"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function AnalyzePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [resumes, setResumes] = useState<any[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState("")
  const [jdText, setJdText] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")
  const [savedId, setSavedId] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/resumes?userId=${session.user.id}`).then((r) => r.json()).then(setResumes)
    }
  }, [session])

  // Auto-save result after analysis completes
  useEffect(() => {
    if (result && selectedResumeId && jdText && !savedId) {
      const resume = resumes.find((r) => r.id === selectedResumeId)
      fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: selectedResumeId,
          resumeTitle: resume?.title || "",
          jdText,
          matchScore: result.match_score,
          missingKeywords: result.missing_keywords,
          improvementTips: result.improvement_tips,
          rawAnalysis: result.raw_analysis,
        }),
      }).then((r) => r.json()).then((data) => {
        if (data.id) setSavedId(data.id)
      }).catch(() => {})
    }
  }, [result, selectedResumeId, jdText, savedId, resumes])

  async function handleAnalyze() {
    if (!selectedResumeId || !jdText.trim()) return
    setLoading(true)
    setError("")
    setResult(null)
    setSavedId("")

    const resume = resumes.find((r) => r.id === selectedResumeId)
    try {
      const res = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: resume?.content || "", jd_text: jdText }),
      })
      if (!res.ok) throw new Error("Analysis failed")
      const data = await res.json()
      setResult(data)
    } catch (e: any) {
      setError(e.message || "Failed to connect to backend.")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">AI Resume Optimizer</h1>
          <div className="flex gap-3">
            <button onClick={() => router.push("/history")} className="text-sm text-purple-600 hover:underline">History</button>
            <button onClick={() => router.push("/dashboard")} className="text-sm text-blue-600 hover:underline">Dashboard</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h2 className="mb-6 text-xl font-semibold">Analyze Resume vs Job Description</h2>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Select Resume</label>
              <select value={selectedResumeId} onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm">
                <option value="">-- Select a resume --</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Job Description</label>
              <textarea value={jdText} onChange={(e) => setJdText(e.target.value)}
                className="h-64 w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Paste the job description here..." />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAnalyze} disabled={loading || !selectedResumeId || !jdText.trim()}
                className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
                {loading ? "Analyzing..." : "Analyze"}
              </button>
              <button onClick={() => router.push("/history")}
                className="rounded bg-purple-100 px-4 py-2 text-sm text-purple-700 hover:bg-purple-200">
                View History
              </button>
            </div>
            {savedId && (
              <div className="rounded bg-green-50 p-2 text-xs text-green-700">
                ✓ Analysis saved. <button onClick={() => router.push(`/history`)} className="underline">View in history</button>
              </div>
            )}
            {error && <div className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          </div>

          <div>
            {result ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold">Match Score</h3>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="text-3xl font-bold">{result.match_score}%</div>
                    <div className="h-3 flex-1 rounded-full bg-gray-200">
                      <div className="h-3 rounded-full bg-blue-600 transition-all"
                        style={{ width: `${result.match_score}%` }} />
                    </div>
                  </div>
                </div>

                {result.missing_keywords?.length > 0 && (
                  <div className="rounded-lg border bg-white p-6 shadow-sm">
                    <h3 className="font-semibold mb-2">Missing Keywords</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.missing_keywords.map((kw: string, i: number) => (
                        <span key={i} className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-700">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}

                {result.improvement_tips?.length > 0 && (
                  <div className="rounded-lg border bg-white p-6 shadow-sm">
                    <h3 className="font-semibold mb-2">Improvement Tips</h3>
                    <ul className="space-y-2">
                      {result.improvement_tips.map((tip: string, i: number) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="mt-0.5 text-green-600">&#x2022;</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border bg-white p-8 text-sm text-gray-400">
                Results will appear here
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
