from typing import Protocol

from models import ParseResponse


class ChatParser(Protocol):
    def parse(self, raw: str) -> ParseResponse: ...
