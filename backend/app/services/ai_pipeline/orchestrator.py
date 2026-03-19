# app/services/ai_pipeline/orchestrator.py
import time
import traceback

from app.core.exceptions import TimestampInvariantError, PipelineConfigurationError
from app.core.settings import Settings

# 💡 분리했던 부품들을 모두 불러옵니다!
from .schemas import TranscriptChunk, PipelinePayload
from .utils import TIMESTAMP_PATTERN
from .interfaces import PdfProvider, SttProvider, RefinementProvider
from .mocks import MockPdfProvider, MockSttProvider, MockRefinementProvider
from .pdf_processor import RealPdfProvider
from .stt_processor import RealSttProvider
from .refinement_processor import RealRefinementProvider

def get_pdf_provider(settings: Settings, mode: str = "mock") -> PdfProvider:
    if mode == "real":
        return RealPdfProvider(settings)
    return MockPdfProvider()

def get_stt_provider(settings: Settings, mode: str = "mock") -> SttProvider:
    if mode == "real":
        return RealSttProvider(settings)
    return MockSttProvider()

def get_refinement_provider(settings: Settings, mode: str = "mock") -> RefinementProvider:
    if mode == "real":
        return RealRefinementProvider(settings)
    return MockRefinementProvider()

class TimestampValidator:
    @staticmethod
    def validate_chunks(chunks: list[TranscriptChunk]) -> None:
        if not chunks:
            raise TimestampInvariantError("세그먼트가 비어 있습니다.")

        for expected_seq, chunk in enumerate(chunks, start=1):
            if chunk.seq != expected_seq:
                raise TimestampInvariantError("세그먼트 seq는 1부터 연속이어야 합니다.")
            if chunk.start_ms < 0:
                raise TimestampInvariantError("세그먼트 start_ms는 0 이상이어야 합니다.")
            if chunk.end_ms <= chunk.start_ms:
                raise TimestampInvariantError("세그먼트 end_ms는 start_ms보다 커야 합니다.")
            if not TIMESTAMP_PATTERN.match(chunk.text):
                raise TimestampInvariantError("세그먼트 텍스트의 타임스탬프 형식이 올바르지 않습니다.")

    @staticmethod
    def assert_invariant(draft_chunks: list[TranscriptChunk], refined_chunks: list[TranscriptChunk]) -> None:
        if len(draft_chunks) != len(refined_chunks):
            raise TimestampInvariantError("후보정 전후 세그먼트 개수가 다릅니다.")

        for draft, refined in zip(draft_chunks, refined_chunks):
            if draft.seq != refined.seq:
                raise TimestampInvariantError("후보정 과정에서 세그먼트 seq가 변경되었습니다.")
            if draft.start_ms != refined.start_ms or draft.end_ms != refined.end_ms:
                raise TimestampInvariantError("후보정 과정에서 타임스탬프가 변경되었습니다.")
            if not TIMESTAMP_PATTERN.match(refined.text):
                raise TimestampInvariantError("후보정 텍스트의 타임스탬프 형식이 올바르지 않습니다.")

class AiPipeline:
    def __init__(
        self,
        *,
        settings: Settings,
        pdf_provider: PdfProvider,
        stt_provider: SttProvider,
        refinement_provider: RefinementProvider,
    ) -> None:
        self._settings = settings
        self._pdf_provider = pdf_provider
        self._stt_provider = stt_provider
        self._refinement_provider = refinement_provider

    def process(self, payload: PipelinePayload) -> list[TranscriptChunk]:
        try:
            pdf_text = ""
            keywords: list[str] = []
            timings: dict[str, float] = {}
            total_start = time.time()

            if payload.pdf_path is not None:
                if payload.on_progress: payload.on_progress(15, "PDF 텍스트 추출 중")
                t0 = time.time()
                pdf_text = self._pdf_provider.extract_text(payload.pdf_path)
                timings["pdf_extract"] = round(time.time() - t0, 3)
                if payload.on_progress: payload.on_progress(30, "키워드 추출 중")
                t1 = time.time()
                keywords = self._pdf_provider.extract_keywords(
                    pdf_text, 
                    self._settings.pdf_keyword_count,
                    payload.board_title,
                    payload.board_subject
                )
                timings["keyword_extract"] = round(time.time() - t1, 3)
                try:
                    media_name = payload.media_path.name if payload.media_path is not None else payload.board_title
                    print(f"[TIMING] Keyword extraction finished for {media_name}: {timings['keyword_extract']}s")
                except Exception:
                    pass

            if payload.on_progress: payload.on_progress(35, "음성 인식 대기 중")
            
            def stt_progress(p: int, msg: str):
                if payload.on_progress:
                    scaled = 35 + int((p / 100.0) * 45)  # 35 ~ 80
                    payload.on_progress(scaled, msg)

            t2 = time.time()
            draft_chunks = self._stt_provider.transcribe(payload.media_path, keywords, on_progress=stt_progress)
            timings["stt_transcribe"] = round(time.time() - t2, 3)
            try:
                media_name = payload.media_path.name if payload.media_path is not None else payload.board_title
                print(f"[TIMING] STT transcription finished for {media_name}: {timings['stt_transcribe']}s")
            except Exception:
                pass
            TimestampValidator.validate_chunks(draft_chunks)

            if payload.on_progress: payload.on_progress(85, "스크립트 AI 후보정 진행 중")

            t3 = time.time()
            refined_chunks = self._refinement_provider.refine(
                pdf_text,
                draft_chunks,
                payload.board_title,
                payload.board_subject,
                keywords
            )
            timings["ai_refine"] = round(time.time() - t3, 3)
            timings["total"] = round(time.time() - total_start, 3)
            try:
                media_name = payload.media_path.name if payload.media_path is not None else payload.board_title
                print(f"[TIMING] AI refinement finished for {media_name}: {timings['ai_refine']}s")
                print(f"[TIMING] AI Pipeline total time for {media_name}: {timings['total']}s")
                print("[TIMING] AI Pipeline timings:", timings)
            except Exception:
                pass
            TimestampValidator.assert_invariant(draft_chunks, refined_chunks)
            if payload.on_progress: payload.on_progress(95, "처리 마무리 중")
            return refined_chunks
            
        except Exception as e:
            print("\n" + "="*50)
            print(f"🚨 [최상위 파이프라인 긴급 포착] 🚨")
            print(f"에러 메시지: {e}")
            traceback.print_exc()
            print("="*50 + "\n")
            raise

def build_ai_pipeline_from_settings(settings: Settings) -> AiPipeline:
    mode = settings.ai_pipeline_mode
    if mode == "mock":
        return AiPipeline(
            settings=settings,
            pdf_provider=MockPdfProvider(),
            stt_provider=MockSttProvider(),
            refinement_provider=MockRefinementProvider(),
        )

    if mode == "real":
        return AiPipeline(
            settings=settings,
            pdf_provider=RealPdfProvider(settings),
            stt_provider=RealSttProvider(settings),
            refinement_provider=RealRefinementProvider(settings),
        )

    raise PipelineConfigurationError("NOTESYNC_AI_PIPELINE_MODE는 mock 또는 real 이어야 합니다.")