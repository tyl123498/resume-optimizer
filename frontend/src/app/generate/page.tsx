"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function GeneratePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [resumes, setResumes] = useState<any[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState("")
  const [jdText, setJdText] = useState("")
  const [loading, setLoading] = useState(false)
  const [optimizedResume, setOptimizedResume] = useState("")
  const [editableContent, setEditableContent] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/resumes?userId=${session.user.id}`).then((r) => r.json()).then(setResumes)
    }
  }, [session])

  async function handleGenerate() {
    if (!selectedResumeId || !jdText.trim()) return
    setLoading(true)
    setError("")
    setOptimizedResume("")

    const resume = resumes.find((r) => r.id === selectedResumeId)
    try {
      const res = await fetch("http://localhost:8000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: resume?.content || "", jd_text: jdText }),
      })
      if (!res.ok) throw new Error("Generation failed")
      const data = await res.json()
      setOptimizedResume(data.optimized_resume)
      setEditableContent(data.optimized_resume)
    } catch (e: any) {
      setError(e.message || "Failed to connect to backend.")
    }
    setLoading(false)
  }

  function handleExportPDF() {
    // Simple print-based export - opens browser print dialog
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>Optimized Resume</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
          h1 { font-size: 24px; border-bottom: 2px solid #333; padding-bottom: 8px; }
          h2 { font-size: 18px; margin-top: 24px; }
          ul { padding-left: 20px; }
          @media print { body { margin: 0; padding: 40px; } }
        </style></head><body>${editableContent.replace(/\n/g, "<br>")}</body></html>
      `)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => printWindow.print(), 500)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">AI Resume Optimizer</h1>
          <button onClick={() => router.push("/dashboard")} className="text-sm text-blue-600 hover:underline">Dashboard</button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h2 className="mb-6 text-xl font-semibold">Generate Optimized Resume</h2>

        {!optimizedResume ? (
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
                className="h-48 w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Paste the job description here..." />
            </div>
            <button onClick={handleGenerate} disabled={loading || !selectedResumeId || !jdText.trim()}
              className="rounded bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50">
              {loading ? "Generating..." : "Generate Optimized Resume"}
            </button>
            {error && <div className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button onClick={handleExportPDF}
                className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700">
                Export as PDF
              </button>
              <button onClick={() => { setOptimizedResume(""); setEditableContent("") }}
                className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">
                New Generation
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Edit your resume (Markdown)</label>
              <textarea value={editableContent} onChange={(e) => setEditableContent(e.target.value)}
                className="h-96 w-full rounded border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="font-semibold mb-2">Preview</h3>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">{editableContent}</div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
