import { NextRequest, NextResponse } from "next/server"
import { findResumeById, updateResume, deleteResume } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const resume = findResumeById(id)
  if (!resume) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(resume)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { title, content } = await request.json()
    const resume = updateResume(id, { ...(title !== undefined && { title }), ...(content !== undefined && { content }) })
    if (!resume) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(resume)
  } catch {
    return NextResponse.json({ error: "Failed to update resume" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!deleteResume(id)) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ success: true })
}
