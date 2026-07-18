import { NextRequest, NextResponse } from "next/server"
import { saveAnalysis, getAnalysisHistory, getAnalysisByResumeId } from "@/lib/db"

export async function GET(request: NextRequest) {
  const resumeId = request.nextUrl.searchParams.get("resumeId")
  const analyses = resumeId ? getAnalysisByResumeId(resumeId) : getAnalysisHistory()
  return NextResponse.json(analyses)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { resumeId, resumeTitle, jdText, matchScore, missingKeywords, improvementTips, rawAnalysis } = body
    if (!resumeId || !jdText) {
      return NextResponse.json({ error: "resumeId and jdText required" }, { status: 400 })
    }
    const analysis = saveAnalysis({
      resumeId,
      resumeTitle: resumeTitle || "",
      jdText,
      matchScore: matchScore || 0,
      missingKeywords: missingKeywords || [],
      improvementTips: improvementTips || [],
      rawAnalysis: rawAnalysis || "",
    })
    return NextResponse.json(analysis, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to save analysis: " + String(error) }, { status: 500 })
  }
}
