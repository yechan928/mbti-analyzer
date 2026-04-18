"""
파싱 단위 테스트 — KakaoIOSParser
"""
import sys
import os

# backend 루트를 import 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from parsing.kakao_ios import KakaoIOSParser


# ── 헬퍼 ──────────────────────────────────────────────────────────────────────

def parse(raw: str):
    return KakaoIOSParser().parse(raw)


# ── 정상 단일 라인 파싱 ────────────────────────────────────────────────────────

def test_single_line_speaker():
    raw = "2026. 4. 7. 12:55, 김예찬 : 안녕하세요"
    result = parse(raw)
    assert len(result.messages) == 1
    assert result.messages[0].speaker == "김예찬"


def test_single_line_text():
    raw = "2026. 4. 7. 12:55, 김예찬 : 안녕하세요"
    result = parse(raw)
    assert result.messages[0].text == "안녕하세요"


def test_single_line_date():
    raw = "2026. 4. 7. 12:55, 김예찬 : 안녕하세요"
    result = parse(raw)
    assert result.messages[0].date == "2026-04-07"


def test_date_zero_padding_month():
    """월/일이 한 자리일 때 두 자리로 패딩되는지 확인"""
    raw = "2026. 1. 5. 09:00, 홍길동 : 테스트"
    result = parse(raw)
    assert result.messages[0].date == "2026-01-05"


def test_speakers_list():
    raw = (
        "2026. 4. 7. 12:55, 김예찬 : 안녕\n"
        "2026. 4. 7. 12:56, 박지성 : 반가워\n"
        "2026. 4. 7. 12:57, 김예찬 : ㅋㅋ\n"
    )
    result = parse(raw)
    # 등장 순서대로, 중복 없이
    assert result.speakers == ["김예찬", "박지성"]


def test_min_max_date():
    raw = (
        "2026. 4. 7. 12:55, A : 첫 메시지\n"
        "2026. 4. 10. 13:00, B : 마지막 메시지\n"
    )
    result = parse(raw)
    assert result.min_date == "2026-04-07"
    assert result.max_date == "2026-04-10"


# ── 멀티라인 메시지 ────────────────────────────────────────────────────────────

def test_multiline_appended_to_previous():
    """줄바꿈 있는 메시지가 이전 메시지에 이어붙는지"""
    raw = (
        "2026. 4. 7. 12:55, 김예찬 : 첫 줄\n"
        "이어지는 두 번째 줄\n"
        "2026. 4. 7. 12:56, 박지성 : 다음 메시지\n"
    )
    result = parse(raw)
    assert result.messages[0].text == "첫 줄\n이어지는 두 번째 줄"
    assert len(result.messages) == 2


def test_multiline_does_not_create_new_message():
    raw = (
        "2026. 4. 7. 12:55, 김예찬 : 본문\n"
        "계속되는 내용\n"
    )
    result = parse(raw)
    assert len(result.messages) == 1


# ── 이모지 포함 메시지 ─────────────────────────────────────────────────────────

def test_emoji_in_text():
    raw = "2026. 4. 7. 18:19, 박지성 : 😀👍🎉"
    result = parse(raw)
    assert result.messages[0].text == "😀👍🎉"


def test_emoji_in_speaker_name():
    """화자 이름에 이모지가 없는 일반 케이스 + 텍스트에 이모지 정상 파싱"""
    raw = "2026. 4. 7. 13:00, 김예찬 : 안녕😊"
    result = parse(raw)
    assert result.messages[0].speaker == "김예찬"
    assert "😊" in result.messages[0].text


# ── 빈 문자열 파싱 ────────────────────────────────────────────────────────────

def test_empty_string_returns_empty_messages():
    result = parse("")
    assert result.messages == []


def test_empty_string_returns_empty_speakers():
    result = parse("")
    assert result.speakers == []


def test_empty_string_min_max_date_empty():
    result = parse("")
    assert result.min_date == ""
    assert result.max_date == ""


# ── SKIP_MARKERS 필터링 ────────────────────────────────────────────────────────

def test_skip_header_line():
    """저장한 날짜 라인은 파싱에서 제외"""
    raw = (
        "저장한 날짜 : 2026. 4. 11. 16:32\n"
        "2026. 4. 7. 12:55, 김예찬 : 안녕\n"
    )
    result = parse(raw)
    assert len(result.messages) == 1


def test_skip_date_header():
    """날짜 헤더(2026년 4월 7일 화요일)는 파싱에서 제외"""
    raw = (
        "2026년 4월 7일 화요일\n"
        "2026. 4. 7. 12:55, 김예찬 : 안녕\n"
    )
    result = parse(raw)
    assert len(result.messages) == 1


def test_skip_invite_line():
    """초대 시스템 메시지는 파싱에서 제외"""
    raw = (
        "2026. 4. 7. 12:55: 박지성님이 김예찬님을 초대했습니다.\n"
        "2026. 4. 7. 12:56, 김예찬 : 안녕\n"
    )
    result = parse(raw)
    assert len(result.messages) == 1
