# app/services/ai_pipeline/mocks.py
from pathlib import Path
from typing import Callable

from .schemas import TranscriptChunk

class MockPdfProvider:
    def extract_text(self, pdf_path: Path) -> str:
        return f"{pdf_path.stem} 강의 자료 요약 텍스트"

    def extract_keywords(self, pdf_text: str, limit: int, board_title: str, board_subject: str = "") -> list[str]:
        base = ["운영체제", "스레드", "프로세스", "동기화", "교착상태"]
        return base[: max(1, min(limit, len(base)))]

class MockSttProvider:
    def transcribe(self, media_path: Path, prompt_keywords: list[str], on_progress: Callable[[int, str], None] | None = None) -> list[TranscriptChunk]:
        _ = media_path
        _ = prompt_keywords
        if on_progress:
            on_progress(100, "음성 인식 완료")
        return [
            TranscriptChunk(
                seq=1,
                start_ms=0,
                end_ms=5000,
                text="[00:00 -> 00:05] 강의 도입부를 설명합니다.",
            ),
            TranscriptChunk(
                seq=2,
                start_ms=5000,
                end_ms=10000,
                text="[00:05 -> 00:10] 핵심 개념을 정리합니다.",
            ),
        ]

class MockRefinementProvider:
    def refine(self, pdf_text: str, draft_chunks: list[TranscriptChunk], board_title: str, board_subject: str = "", keywords: list[str] = None) -> list[TranscriptChunk]:
        _ = pdf_text
        _ = board_title
        _ = board_subject
        refined: list[TranscriptChunk] = []
        for chunk in draft_chunks:
            suffix = " (후보정)"
            if chunk.text.endswith(suffix):
                refined.append(chunk)
            else:
                refined.append(
                    TranscriptChunk(
                        seq=chunk.seq,
                        start_ms=chunk.start_ms,
                        end_ms=chunk.end_ms,
                        text=f"{chunk.text}{suffix}",
                    )
                )
        return refined