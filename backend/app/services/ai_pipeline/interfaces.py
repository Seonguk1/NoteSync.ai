# app/services/ai_pipeline/interfaces.py
from typing import Callable, Protocol
from pathlib import Path
from .schemas import TranscriptChunk

class PdfProvider(Protocol):
    def extract_text(self, pdf_path: Path) -> str:
        ...

    def extract_keywords(self, pdf_text: str, limit: int, board_title: str, board_subject: str = "") -> list[str]:
        ...

class SttProvider(Protocol):
    def transcribe(self, media_path: Path, prompt_keywords: list[str], on_progress: Callable[[int, str], None] | None = None) -> list[TranscriptChunk]:
        ...

class RefinementProvider(Protocol):
    def refine(self, pdf_text: str, draft_chunks: list[TranscriptChunk], board_title: str, board_subject: str = "", keywords: list[str] = None) -> list[TranscriptChunk]:
        ...