"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function NewResumePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  const template = `# Contact Info
Name: Your Name
Email: your.email@example.com
Phone: (123) 456-7890
LinkedIn: linkedin.com/in/yourprofile

# Professional Summary
A brief 2-3 sentence summary of your professional background and career goals.

# Skills
- Skill 1
- Skill 2
- Skill 3

# Experience
## Company Name | Job Title | Start Date - End Date
- Bullet point describing your responsibility and achievement
- Use metrics where possible (e.g., "Increased revenue by 20%")

# Education
## University Name | Degree | Year
- Relevant coursework or achievements

# Certifications / Projects (optional)
- Certification or project name`

  async function handleSave() {
    if (!title.trim() || !content.trim() || !session?.user?.id) return
    setSaving(true)
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          title: title || "Untitled Resume",
          content,
        }),
      })
      const data = await res.json()
      router.push(`/resume/${data.id}`)
    } catch (e) {
      console.error("Failed to save resume", e)
    }
    setSaving(false)
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
        <h2 className="mb-6 text-xl font-semibold">New Resume</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Software Engineer Resume" />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Content (Markdown)</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)}
            className="h-96 w-full rounded border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={template} />
        </div>

        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving || !content.trim()}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save Resume"}
          </button>
          <button onClick={() => setContent(template)}
            className="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">
            Use Template
          </button>
        </div>
      </main>
    </div>
  )
}
