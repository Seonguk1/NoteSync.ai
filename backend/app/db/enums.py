
from enum import Enum

class BoardStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    POSTPROCESSING = "postprocessing"
    COMPLETED = "completed"
    FAILED = "failed"

class AssetType(str, Enum):
    MEDIA = "media"
    PDF = "pdf"

# 기존 코드 호환용 ProcessingStage Enum 추가
class ProcessingStage(str, Enum):
    QUEUED = "queued"
    STT = "stt"
    POSTPROCESS = "postprocess"
    DONE = "done"
    FAILED = "failed"

# 파이프라인 Resume용 Enum 추가
class PipelineStage(str, Enum):
    UPLOADED = "uploaded"
    PDF_EXTRACTION = "pdf_extraction"
    KEYWORD_EXTRACTION = "keyword_extraction"
    WHISPER_STT = "whisper_stt"
    AI_REFINEMENT = "ai_refinement"
    COMPLETED = "completed"

    @property
    def api_alias(self) -> str:
        # 프론트/문서 표준 문자열로 변환
        mapping = {
            PipelineStage.UPLOADED: "queued",
            PipelineStage.PDF_EXTRACTION: "extract_pdf",
            PipelineStage.KEYWORD_EXTRACTION: "keywords",
            PipelineStage.WHISPER_STT: "stt",
            PipelineStage.AI_REFINEMENT: "postprocess",
            PipelineStage.COMPLETED: "done",
        }
        return mapping.get(self, self.value)

    @staticmethod
    def from_api_alias(alias: str) -> "PipelineStage":
        reverse = {
            "queued": PipelineStage.UPLOADED,
            "extract_pdf": PipelineStage.PDF_EXTRACTION,
            "keywords": PipelineStage.KEYWORD_EXTRACTION,
            "stt": PipelineStage.WHISPER_STT,
            "postprocess": PipelineStage.AI_REFINEMENT,
            "done": PipelineStage.COMPLETED,
        }
        return reverse.get(alias, PipelineStage.UPLOADED)

class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class TranscriptSourceType(str, Enum):
    STT_DRAFT = "stt_draft"
    LLM_REFINED = "llm_refined"
    USER_EDITED = "user_edited"