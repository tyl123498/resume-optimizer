"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"

export default function ResumeDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (id && status === "authenticated") {
      fetch(`/api/resumes/${id}`)
        .then((r) => r.json())
        .then((data) => { setTitle(data.title); setContent(data.content); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [id, status])

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/resumes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      })
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm("Delete this resume?")) return
    try {
      await fetch(`/api/resumes/${id}`, { method: "DELETE" })
      router.push("/dashboard")
    } catch (e) { console.error(e) }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center"><p>Loading...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">AI Resume Optimizer</h1>
          <div className="flex gap-3">
            <button onClick={() => router.push("/analyze")} className="text-sm text-green-600 hover:underline">Analyze</button>
            <button onClick={() => router.push("/dashboard")} className="text-sm text-blue-600 hover:underline">Dashboard</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Content (Markdown)</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)}
            className="h-96 w-full rounded border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={() => router.push(`/analyze`)}
            className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700">
            Analyze with JD
          </button>
          <button onClick={handleDelete}
            className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">
            Delete
          </button>
        </div>
      </main>
    </div>
  )
}
