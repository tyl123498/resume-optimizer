import json
from typing import Optional
from pydantic import BaseModel, Field


class ResumeJDInput(BaseModel):
    resume_text: str = Field(..., description="Resume text content")
    jd_text: str = Field(..., description="Job description text content")


class AnalysisResult(BaseModel):
    match_score: int = Field(..., description="Match score 0-100")
    missing_keywords: list[str] = Field(default_factory=list, description="Missing key skills/keywords")
    improvement_tips: list[str] = Field(default_factory=list, description="3-5 improvement suggestions")
    raw_analysis: Optional[str] = Field(None, description="Raw LLM output for debugging")


class GenerateResult(BaseModel):
    optimized_resume: str = Field(..., description="Optimized resume in Markdown format")


class ErrorResponse(BaseModel):
    detail: str = Field(..., description="Error message")
