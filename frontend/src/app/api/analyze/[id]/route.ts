import { NextRequest, NextResponse } from "next/server"
import { getAnalysisById, updateAnalysisOptimizedResume } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const analysis = getAnalysisById(id)
  if (!analysis) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(analysis)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { optimizedResume } = await request.json()
    if (updateAnalysisOptimizedResume(id, optimizedResume)) {
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
