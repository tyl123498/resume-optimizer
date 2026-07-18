import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from schemas import ResumeJDInput, AnalysisResult, GenerateResult, ErrorResponse
from chains import analyze_resume, generate_resume

app = FastAPI(
    title="AI Resume Optimizer API",
    description="Backend service for resume-JD analysis and AI-powered resume generation",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "resume-optimizer-api"}


@app.post("/analyze", response_model=AnalysisResult, responses={500: {"model": ErrorResponse}})
async def analyze(input_data: ResumeJDInput):
    if not input_data.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text cannot be empty")
    if not input_data.jd_text.strip():
        raise HTTPException(status_code=400, detail="Job description text cannot be empty")
    try:
        return await analyze_resume(input_data.resume_text, input_data.jd_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/generate", response_model=GenerateResult, responses={500: {"model": ErrorResponse}})
async def generate(input_data: ResumeJDInput):
    if not input_data.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text cannot be empty")
    if not input_data.jd_text.strip():
        raise HTTPException(status_code=400, detail="Job description text cannot be empty")
    try:
        return await generate_resume(input_data.resume_text, input_data.jd_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
