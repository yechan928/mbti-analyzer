"""
API 엔드포인트 테스트 — FastAPI TestClient 사용
Ollama 실제 호출 없이 모킹.
"""
import sys
import os
from io import BytesIO
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# backend 루트를 import 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ollama 모듈을 가짜로 패치한 뒤 app import — import 순서 주의
with patch.dict("sys.modules", {"ollama": MagicMock()}):
    from main import app

client = TestClient(app)


# ── /api/health ───────────────────────────────────────────────────────────────

def test_health_status_ok():
    """GET /api/health 응답에 status: ok 포함"""
    with patch("main.ollama") as mock_ollama:
        mock_ollama.list.return_value = []
        resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_health_ollama_false_when_unavailable():
    """ollama.list() 예외 시 ollama: false 반환"""
    with patch("main.ollama") as mock_ollama:
        mock_ollama.list.side_effect = Exception("connection refused")
        resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["ollama"] is False


# ── /api/parse ────────────────────────────────────────────────────────────────

NORMAL_KAKAO = (
    "2026. 4. 7. 12:55, 김예찬 : 안녕하세요\n"
    "2026. 4. 7. 12:56, 박지성 : 반갑습니다\n"
    "2026. 4. 7. 12:57, 김예찬 : 좋은 하루\n"
).encode("utf-8")


def _upload(content: bytes, filename: str = "test.txt"):
    return client.post(
        "/api/parse",
        files={"file": (filename, BytesIO(content), "text/plain")},
    )


def test_parse_normal_has_speakers():
    resp = _upload(NORMAL_KAKAO)
    assert resp.status_code == 200
    assert "speakers" in resp.json()
    assert len(resp.json()["speakers"]) > 0


def test_parse_normal_has_messages():
    resp = _upload(NORMAL_KAKAO)
    assert resp.status_code == 200
    assert "messages" in resp.json()
    assert len(resp.json()["messages"]) > 0


def test_parse_normal_has_min_date():
    resp = _upload(NORMAL_KAKAO)
    assert resp.status_code == 200
    assert "min_date" in resp.json()
    assert resp.json()["min_date"] != ""


def test_parse_normal_has_max_date():
    resp = _upload(NORMAL_KAKAO)
    assert resp.status_code == 200
    assert "max_date" in resp.json()
    assert resp.json()["max_date"] != ""


def test_parse_empty_file_returns_200():
    """빈 파일 → 에러 아닌 빈 결과"""
    resp = _upload(b"")
    assert resp.status_code == 200


def test_parse_empty_file_speakers_empty():
    resp = _upload(b"")
    assert resp.json()["speakers"] == []


def test_parse_empty_file_messages_empty():
    resp = _upload(b"")
    assert resp.json()["messages"] == []


def test_parse_non_kakao_format_speakers_empty():
    """카카오톡 형식이 아닌 파일 → 빈 speakers"""
    content = b"Hello world\nThis is not kakao format\nRandom text here\n"
    resp = _upload(content)
    assert resp.status_code == 200
    assert resp.json()["speakers"] == []


def test_parse_non_kakao_format_messages_empty():
    content = b"Hello world\nThis is not kakao format\nRandom text here\n"
    resp = _upload(content)
    assert resp.json()["messages"] == []


# ── /api/analyze ─────────────────────────────────────────────────────────────

def _analyze_payload(
    speaker: str,
    message_count: int,
    date_from: str = "2026-04-01",
    date_to: str = "2026-04-30",
):
    messages = [
        {"speaker": speaker, "text": f"메시지 {i}", "date": "2026-04-07"}
        for i in range(message_count)
    ]
    return {
        "target_speaker": speaker,
        "messages": messages,
        "date_from": date_from,
        "date_to": date_to,
    }


def test_analyze_too_few_messages_returns_400():
    """20개 미만 메시지 → HTTP 400"""
    payload = _analyze_payload("김예찬", message_count=5)
    resp = client.post("/api/analyze", json=payload)
    assert resp.status_code == 400


def test_analyze_zero_messages_returns_400():
    """메시지 0개 → HTTP 400"""
    payload = _analyze_payload("김예찬", message_count=0)
    resp = client.post("/api/analyze", json=payload)
    assert resp.status_code == 400


def test_analyze_nonexistent_speaker_returns_400():
    """존재하지 않는 화자 → 필터 후 메시지 0개 → HTTP 400"""
    messages = [
        {"speaker": "김예찬", "text": f"메시지 {i}", "date": "2026-04-07"}
        for i in range(30)
    ]
    payload = {
        "target_speaker": "존재하지않는화자",
        "messages": messages,
        "date_from": "2026-04-01",
        "date_to": "2026-04-30",
    }
    resp = client.post("/api/analyze", json=payload)
    assert resp.status_code == 400


def test_analyze_19_messages_returns_400():
    """경계값: 19개(20개 미만) → HTTP 400"""
    payload = _analyze_payload("김예찬", message_count=19)
    resp = client.post("/api/analyze", json=payload)
    assert resp.status_code == 400
