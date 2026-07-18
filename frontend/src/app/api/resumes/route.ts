import { NextRequest, NextResponse } from "next/server"
import { findResumesByUserId, createResume } from "@/lib/db"

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
  const resumes = findResumesByUserId(userId)
  return NextResponse.json(resumes)
}

export async function POST(request: Request) {
  try {
    const { userId, title, content } = await request.json()
    if (!userId || !content) {
      return NextResponse.json({ error: "userId and content required" }, { status: 400 })
    }
    const resume = createResume(userId, title, content)
    return NextResponse.json(resume, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create resume" }, { status: 500 })
  }
}
