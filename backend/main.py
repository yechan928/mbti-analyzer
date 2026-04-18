import ollama
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from analysis.llm import stream_analyze_mbti
from models import AnalyzeRequest, ParseResponse
from parsing.kakao_ios import KakaoIOSParser

app = FastAPI(title="MBTI Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MIN_MESSAGES_FOR_ANALYSIS = 20


@app.get("/api/health")
async def health():
    try:
        ollama.list()
        ollama_ok = True
    except Exception:
        ollama_ok = False
    return {"status": "ok", "ollama": ollama_ok}


@app.post("/api/parse", response_model=ParseResponse)
async def parse(file: UploadFile):
    raw_bytes = await file.read()
    raw = raw_bytes.decode("utf-8", errors="replace")
    return KakaoIOSParser().parse(raw)


@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    ranged = [m for m in req.messages if req.date_from <= m.date <= req.date_to]
    filtered_count = sum(1 for m in ranged if m.speaker == req.target_speaker)
    if filtered_count < MIN_MESSAGES_FOR_ANALYSIS:
        raise HTTPException(
            status_code=400,
            detail=f"선택한 기간에 해당 화자의 메시지가 {MIN_MESSAGES_FOR_ANALYSIS}개 이상 필요합니다.",
        )
    return StreamingResponse(
        stream_analyze_mbti(req.target_speaker, ranged),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
