import json
import re
from collections.abc import AsyncGenerator

import ollama

from analysis.prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
from models import AnalyzeResponse, Message

MODEL = "gemma4:e2b"
MAX_PROMPT_CHARS = 6000
HEADER_RE = re.compile(
    r"^##\s+[^\n]*?MBTI는\s+([IE][NS][TF][JP])[^\n]*", re.MULTILINE
)
# 축별 결과 파싱 — 헤더보다 신뢰도 높음
_AXIS_RE = {
    "EI": re.compile(r"E vs I\s*[—-]\s*결과:\s*([EI])"),
    "SN": re.compile(r"S vs N\s*[—-]\s*결과:\s*([SN])"),
    "TF": re.compile(r"T vs F\s*[—-]\s*결과:\s*([TF])"),
    "JP": re.compile(r"J vs P\s*[—-]\s*결과:\s*([JP])"),
}


def _build_conversation_text(messages: list[Message]) -> str:
    # 최근 메시지부터 역순으로 누적해 MAX_PROMPT_CHARS 안에 채운 뒤 순서 복원
    lines = [f"{m.speaker}: {m.text}" for m in messages]
    result: list[str] = []
    total = 0
    for line in reversed(lines):
        if total + len(line) + 1 > MAX_PROMPT_CHARS:
            break
        result.append(line)
        total += len(line) + 1
    return "\n".join(reversed(result))


def _extract_mbti_from_axes(markdown: str) -> str:
    """축별 결과를 파싱해 4자리 코드 조합. 하나라도 없으면 빈 문자열 반환."""
    parts = [_AXIS_RE[axis].search(markdown) for axis in ("EI", "SN", "TF", "JP")]
    if not all(parts):
        return ""
    return "".join(m.group(1) for m in parts)  # type: ignore[union-attr]


def _fix_header(markdown: str, target_speaker: str) -> str:
    # 축별 분석 결과를 기준으로 코드 조합 (헤더보다 신뢰도 높음)
    mbti_code = _extract_mbti_from_axes(markdown)
    if not mbti_code:
        # 파싱 실패 시 헤더에서 추출
        match = HEADER_RE.search(markdown)
        if not match:
            return markdown
        mbti_code = match.group(1)
    new_header = f"## {target_speaker}의 MBTI는 {mbti_code}입니다"
    return HEADER_RE.sub(new_header, markdown, count=1)


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


async def stream_analyze_mbti(
    target_speaker: str, messages: list[Message]
) -> AsyncGenerator[str, None]:
    try:
        yield _sse({"type": "stage", "text": "분석 텍스트 구성 중"})
        count = sum(1 for m in messages if m.speaker == target_speaker)
        user_prompt = USER_PROMPT_TEMPLATE.format(
            target_speaker=target_speaker,
            count=count,
            joined_messages=_build_conversation_text(messages),
        )

        yield _sse({"type": "stage", "text": "AI 모델 호출 중"})
        client = ollama.AsyncClient()
        full_text = ""
        first_token = True

        async for part in await client.chat(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            options={"temperature": 0.3, "seed": 42, "num_ctx": 8192},
            stream=True,
        ):
            if first_token:
                yield _sse({"type": "stage", "text": "보고서 작성 중"})
                first_token = False
            token = part["message"]["content"]
            full_text += token
            yield _sse({"type": "token", "text": token})

        full_text = _fix_header(full_text, target_speaker)
        mbti = _extract_mbti_from_axes(full_text)
        yield _sse({"type": "done", "mbti": mbti, "report": full_text})
    except Exception as e:
        yield _sse({"type": "error", "message": f"Ollama 호출 실패: {e}"})


def analyze_mbti(target_speaker: str, messages: list[Message]) -> AnalyzeResponse:
    filtered = [m for m in messages if m.speaker == target_speaker]
    count = len(filtered)

    user_prompt = USER_PROMPT_TEMPLATE.format(
        target_speaker=target_speaker,
        count=count,
        joined_messages=_build_conversation_text(messages),
    )

    response = ollama.chat(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        options={"temperature": 0.3, "seed": 42, "num_ctx": 8192},
    )

    report_markdown = response["message"]["content"]
    report_markdown = _fix_header(report_markdown, target_speaker)
    # \b가 한국어 앞에서 작동 안 해서 HEADER_RE로 추출
    header_match = HEADER_RE.search(report_markdown)
    mbti = header_match.group(1) if header_match else ""

    return AnalyzeResponse(
        mbti=mbti,
        report_markdown=report_markdown,
        message_count=count,
    )
