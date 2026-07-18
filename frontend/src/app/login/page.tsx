"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (isRegister) {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Registration failed")
        setLoading(false)
        return
      }
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      setError("Invalid email or password")
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-center">
          {isRegister ? "Create Account" : "Sign In"}
        </h1>
        {error && (
          <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Your name" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="you@example.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter password" required />
          </div>
          <button type="submit" disabled={loading}
            className="w-full rounded bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Loading..." : isRegister ? "Register" : "Sign In"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <button onClick={() => { setIsRegister(!isRegister); setError("") }}
            className="text-blue-600 hover:underline">
            {isRegister ? "Sign In" : "Register"}
          </button>
        </p>
      </div>
    </div>
  )
}
