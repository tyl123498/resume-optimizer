import os, json, re, asyncio
import httpx
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from schemas import AnalysisResult, GenerateResult
from logger import log_event

LLM_PROVIDER = os.environ.get('LLM_PROVIDER', 'openai').lower()
OLLAMA_BASE_URL = os.environ.get('OLLAMA_BASE_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'qwen2.5:7b')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
OPENAI_BASE_URL = os.environ.get('OPENAI_BASE_URL', 'https://api.deepseek.com/v1')
OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'deepseek-chat')

_llm = None

def get_llm():
    global _llm
    if _llm is not None:
        return _llm
    if LLM_PROVIDER == 'openai':
        if not OPENAI_API_KEY:
            raise ValueError('LLM_PROVIDER is set to openai but OPENAI_API_KEY is not set.')
        from langchain_openai import ChatOpenAI
        _llm = ChatOpenAI(
            model=OPENAI_MODEL, api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL,
            temperature=0.3, max_tokens=2048, timeout=30, max_retries=1,
        )
    else:
        from langchain_ollama import ChatOllama
        _llm = ChatOllama(
            model=OLLAMA_MODEL, base_url=OLLAMA_BASE_URL,
            temperature=0.3, num_predict=2048,
        )
    return _llm

# ===== Prompt Templates =====

ANALYSIS_TEMPLATE = """You are a professional resume consultant and technical recruiter. Analyze the match between a candidate's resume and a job description.

Resume:
{resume_text}

Job Description:
{jd_text}

Your task:
1. Calculate an overall match score (0-100) based on skills overlap, experience relevance, and keyword matching.
2. List the top 5-10 missing keywords or skills that the JD requires but the resume lacks.
3. Provide 3-5 specific, actionable improvement tips to better align the resume with this JD.

Respond in the following JSON format ONLY (no other text):
{{"match_score": <integer 0-100>,"missing_keywords": ["keyword1", "keyword2", ...],"improvement_tips": ["tip 1", "tip 2", ...]}}"""

analysis_prompt = PromptTemplate(input_variables=['resume_text', 'jd_text'], template=ANALYSIS_TEMPLATE)
analysis_chain = analysis_prompt | get_llm() | StrOutputParser()

GENERATION_TEMPLATE = """You are an expert resume writer. Rewrite the following resume to better match the job description below. Keep it truthful\u2014do not fabricate experience\u2014but emphasize relevant skills, quantify achievements, and rephrase bullet points to align with the target role.

Original Resume:
{resume_text}

Target Job Description:
{jd_text}

Output the optimized resume in Markdown format with these sections:
- **Contact Info** (name, email, phone, LinkedIn \u2014 keep original data)
- **Professional Summary** (2-3 lines tailored to the JD)
- **Skills** (reorder: put JD-relevant skills first)
- **Experience** (rephrase bullet points to emphasize JD keywords; add metrics where possible)
- **Education**
- **Certifications / Projects** (if applicable)

Do NOT include any explanatory text before or after the resume. Output ONLY the Markdown resume."""

generation_prompt = PromptTemplate(input_variables=['resume_text', 'jd_text'], template=GENERATION_TEMPLATE)
generation_chain = generation_prompt | get_llm() | StrOutputParser()

# ===== Retryable status codes =====
RETRYABLE_CODES = {429, 500, 502, 503, 504}


async def _call_chain(chain, inputs, max_retries=1):
    for attempt in range(max_retries + 1):
        try:
            return await chain.ainvoke(inputs)
        except httpx.TimeoutException:
            log_event('llm_timeout', attempt=attempt, max_retries=max_retries)
            if attempt < max_retries:
                await asyncio.sleep(2)
                continue
            raise
        except Exception as e:
            status = getattr(e, 'status_code', None)
            if status and status in RETRYABLE_CODES:
                log_event('llm_retryable_error', status_code=status, attempt=attempt, max_retries=max_retries)
                if attempt < max_retries:
                    await asyncio.sleep(2)
                    continue
            raise
    raise RuntimeError('LLM call failed after max retries')


async def analyze_resume(resume_text, jd_text):
    try:
        result_text = await _call_chain(analysis_chain, {'resume_text': resume_text, 'jd_text': jd_text})
        json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
        data = json.loads(json_match.group()) if json_match else json.loads(result_text)
        return AnalysisResult(
            match_score=data.get('match_score', 50),
            missing_keywords=data.get('missing_keywords', []),
            improvement_tips=data.get('improvement_tips', []),
            raw_analysis=result_text,
        )
    except Exception as e:
        log_event('analyze_error', error=str(e))
        return AnalysisResult(
            match_score=50, missing_keywords=[],
            improvement_tips=['Analysis failed, please try again.'],
            raw_analysis=f'Error: {e}',
        )


async def generate_resume(resume_text, jd_text):
    try:
        result_text = await _call_chain(generation_chain, {'resume_text': resume_text, 'jd_text': jd_text})
        return GenerateResult(optimized_resume=result_text.strip())
    except Exception as e:
        log_event('generate_error', error=str(e))
        raise
