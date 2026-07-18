"use client"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface Resume {
  id: string
  title: string
  updatedAt: string
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/resumes?userId=${session.user.id}`)
        .then((r) => r.json())
        .then((data) => { setResumes(data); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [session])

  if (status === "loading") return <div className="flex min-h-screen items-center justify-center"><p>Loading...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">AI Resume Optimizer</h1>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/history")} className="text-sm text-purple-600 hover:underline">History</button>
            <span className="text-sm text-gray-600">{session?.user?.email}</span>
            <button onClick={() => signOut()} className="text-sm text-red-600 hover:underline">Sign Out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">My Resumes</h2>
          <button onClick={() => router.push("/resume/new")}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
            + New Resume
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading resumes...</p>
        ) : resumes.length === 0 ? (
          <div className="rounded-lg border bg-white p-8 text-center">
            <p className="text-gray-500">No resumes yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resumes.map((r) => (
              <div key={r.id} className="rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/resume/${r.id}`)}>
                <h3 className="font-medium truncate">{r.title}</h3>
                <p className="mt-1 text-xs text-gray-400">Updated: {new Date(r.updatedAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12">
          <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="font-medium">Analyze Resume</h3>
              <p className="mt-1 text-sm text-gray-500">Paste a job description and get a match analysis.</p>
              <button onClick={() => router.push("/analyze")}
                className="mt-3 rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700">
                Go to Analyze
              </button>
            </div>
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="font-medium">Generate Resume</h3>
              <p className="mt-1 text-sm text-gray-500">Generate an optimized resume tailored to a JD.</p>
              <button onClick={() => router.push("/generate")}
                className="mt-3 rounded bg-purple-600 px-3 py-1.5 text-sm text-white hover:bg-purple-700">
                Go to Generate
              </button>
            </div>
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="font-medium">Analysis History</h3>
              <p className="mt-1 text-sm text-gray-500">Browse past JD analyses and generated results.</p>
              <button onClick={() => router.push("/history")}
                className="mt-3 rounded bg-orange-600 px-3 py-1.5 text-sm text-white hover:bg-orange-700">
                View History
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
