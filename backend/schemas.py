from typing import Optional
from pydantic import BaseModel, Field

class ResumeJDInput(BaseModel):
    resume_text: str = Field(..., description='Resume text content')
    jd_text: str = Field(..., description='Job description text content')

class AnalysisResult(BaseModel):
    match_score: int = Field(..., description='Match score 0-100')
    missing_keywords: list[str] = Field(default_factory=list)
    improvement_tips: list[str] = Field(default_factory=list)
    raw_analysis: Optional[str] = Field(None)

class GenerateResult(BaseModel):
    optimized_resume: str = Field(..., description='Optimized resume in Markdown format')

class ErrorResponse(BaseModel):
    detail: str = Field(..., description='Error message')

class CreateOrderRequest(BaseModel):
    resume_text: str = Field(..., min_length=50, max_length=8000)
    jd_text: str = Field(..., min_length=20, max_length=4000)
    is_test: bool = Field(default=False)

class CreateOrderResponse(BaseModel):
    order_id: str; qr_url: str; access_token: str; amount: int

class OrderStatusResponse(BaseModel):
    order_id: str; status: str

class OptimizeRequest(BaseModel):
    order_id: str; access_token: str

class OptimizeResponse(BaseModel):
    match_score: int
    missing_keywords: list[str]
    improvement_tips: list[str]
    optimized_resume: str

class ResultResponse(BaseModel):
    analysis_result: dict | None
    generate_result: str | None

class APIError(BaseModel):
    code: str; detail: str
