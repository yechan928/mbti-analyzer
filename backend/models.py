from pydantic import BaseModel


class Message(BaseModel):
    speaker: str
    text: str
    date: str  # "YYYY-MM-DD"


class ParseResponse(BaseModel):
    messages: list[Message]
    speakers: list[str]
    min_date: str  # "YYYY-MM-DD"
    max_date: str  # "YYYY-MM-DD"


class AnalyzeRequest(BaseModel):
    target_speaker: str
    messages: list[Message]
    date_from: str  # "YYYY-MM-DD"
    date_to: str    # "YYYY-MM-DD"


class AnalyzeResponse(BaseModel):
    mbti: str
    report_markdown: str
    message_count: int
