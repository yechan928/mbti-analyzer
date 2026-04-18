import re

from models import Message, ParseResponse

LINE_RE = re.compile(
    r"^(?P<year>\d{4})\.\s(?P<month>\d{1,2})\.\s(?P<day>\d{1,2})\.\s\d{1,2}:\d{2},\s(?P<speaker>.+?)\s:\s(?P<text>.*)$"
)

DATE_HEADER_RE = re.compile(r"^\d{4}년\s\d{1,2}월\s\d{1,2}일")

SKIP_MARKERS = (
    "저장한 날짜 :",
    "---------------",
    "님이 들어왔습니다",
    "님이 나갔습니다",
    "님을 초대했습니다",
    "님이 초대했습니다",
    "방장이",
    "샵검색:",
)


def _should_skip(line: str) -> bool:
    if DATE_HEADER_RE.match(line):
        return True
    return any(marker in line for marker in SKIP_MARKERS)


def _normalize_speaker(name: str) -> str:
    return re.sub(r"\s+", "", name).strip()


class KakaoIOSParser:
    def parse(self, raw: str) -> ParseResponse:
        messages: list[Message] = []
        current: Message | None = None
        current_date: str = ""

        for line in raw.split("\n"):
            if _should_skip(line):
                continue

            match = LINE_RE.match(line)
            if match:
                if current is not None:
                    messages.append(current)
                current_date = (
                    f"{match.group('year')}-"
                    f"{int(match.group('month')):02d}-"
                    f"{int(match.group('day')):02d}"
                )
                current = Message(
                    speaker=_normalize_speaker(match.group("speaker")),
                    text=match.group("text").strip(),
                    date=current_date,
                )
            elif current is not None and line.strip():
                current.text += "\n" + line.strip()

        if current is not None:
            messages.append(current)

        seen: set[str] = set()
        speakers: list[str] = []
        for msg in messages:
            if msg.speaker not in seen:
                seen.add(msg.speaker)
                speakers.append(msg.speaker)

        dates = [m.date for m in messages if m.date]
        min_date = min(dates) if dates else ""
        max_date = max(dates) if dates else ""

        return ParseResponse(
            messages=messages,
            speakers=speakers,
            min_date=min_date,
            max_date=max_date,
        )
