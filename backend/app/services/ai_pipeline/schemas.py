# app/services/ai_pipeline/schemas.py
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

@dataclass(frozen=True)
class TranscriptChunk:
    seq: int
    start_ms: int
    end_ms: int
    text: str

@dataclass(frozen=True)
class PipelinePayload:
    media_path: Path
    pdf_path: Path | None
    board_title: str
    board_subject: str = ""
    on_progress: Callable[[int, str], None] | None = None