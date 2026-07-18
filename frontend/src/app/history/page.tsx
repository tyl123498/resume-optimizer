"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

interface Analysis {
  id: string
  resumeId: string
  resumeTitle: string
  jdText: string
  matchScore: number
  missingKeywords: string
  improvementTips: string
  rawAnalysis: string
  optimizedResume: string
  createdAt: string
}

export default function HistoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Analysis | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (!session?.user?.id) return
    // Get all resumes for this user, then fetch analyses for each
    fetch(`/api/resumes?userId=${session.user.id}`)
      .then((r) => r.json())
      .then(async (resumes) => {
        const all: Analysis[] = []
        for (const r of resumes) {
          const res = await fetch(`/api/analyze?resumeId=${r.id}`)
          const data = await res.json()
          all.push(...data)
        }
        all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        setAnalyses(all)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [session])

  function parseJSON(val: string): string[] {
    try { return JSON.parse(val) } catch { return [] }
  }

  if (status === "loading" || loading) {
    return <div className="flex min-h-screen items-center justify-center"><p>Loading...</p></div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">AI Resume Optimizer</h1>
          <div className="flex gap-3">
            <button onClick={() => router.push("/analyze")} className="text-sm text-blue-600 hover:underline">Analyze</button>
            <button onClick={() => router.push("/dashboard")} className="text-sm text-blue-600 hover:underline">Dashboard</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h2 className="mb-6 text-xl font-semibold">Analysis History</h2>

        {!selected ? (
          <>
            {analyses.length === 0 ? (
              <div className="rounded-lg border bg-white p-8 text-center">
                <p className="text-gray-500">No analysis history yet. Go to <a href="/analyze" className="text-blue-600 underline">Analyze</a> to run your first analysis.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {analyses.map((a) => (
                  <div key={a.id} className="rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelected(a)}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{a.resumeTitle || "Untitled Resume"}</h3>
                        <p className="mt-1 text-xs text-gray-400">
                          {new Date(a.createdAt).toLocaleString()} &middot; JD: {a.jdText.substring(0, 60)}...
                        </p>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-lg font-bold">{a.matchScore}%</div>
                        <div className="mt-1 h-2 w-20 rounded-full bg-gray-200">
                          <div className="h-2 rounded-full bg-blue-600" style={{ width: `${a.matchScore}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <button onClick={() => setSelected(null)} className="text-sm text-blue-600 hover:underline">&larr; Back to list</button>

            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold">{selected.matchScore}% Match</h3>
              <div className="mt-2 h-3 w-full rounded-full bg-gray-200">
                <div className="h-3 rounded-full bg-blue-600" style={{ width: `${selected.matchScore}%` }} />
              </div>
            </div>

            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="font-semibold mb-2">Resume</h3>
              <p className="text-sm">{selected.resumeTitle}</p>
            </div>

            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="font-semibold mb-2">Job Description</h3>
              <pre className="whitespace-pre-wrap text-sm text-gray-700">{selected.jdText}</pre>
            </div>

            {parseJSON(selected.missingKeywords).length > 0 && (
              <div className="rounded-lg border bg-white p-6 shadow-sm">
                <h3 className="font-semibold mb-2">Missing Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {parseJSON(selected.missingKeywords).map((kw, i) => (
                    <span key={i} className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-700">{kw}</span>
                  ))}
                </div>
              </div>
            )}

            {parseJSON(selected.improvementTips).length > 0 && (
              <div className="rounded-lg border bg-white p-6 shadow-sm">
                <h3 className="font-semibold mb-2">Improvement Tips</h3>
                <ul className="space-y-2">
                  {parseJSON(selected.improvementTips).map((tip, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="mt-0.5 text-green-600">&#x2022;</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selected.rawAnalysis && (
              <div className="rounded-lg border bg-white p-6 shadow-sm">
                <h3 className="font-semibold mb-2">Raw Analysis</h3>
                <pre className="whitespace-pre-wrap text-xs text-gray-500">{selected.rawAnalysis}</pre>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => router.push(`/generate`)}
                className="rounded bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700">
                Generate Optimized Resume
              </button>
              <button onClick={() => {
                setSelected(null)
                router.push(`/analyze`)
              }} className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">
                New Analysis
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
