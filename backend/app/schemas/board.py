from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import Field, field_validator, model_validator

from app.db.enums import BoardStatus, PipelineStage, TranscriptSourceType

from .common import ApiModel, PageResponse


class FolderRef(ApiModel):
    id: int
    name: str


class ProcessingProgress(ApiModel):
    job_id: int
    stage: str  # API 응답은 alias 문자열로 반환
    progress_percent: int = Field(ge=0, le=100)
    message: Optional[str] = None


class BoardActions(ApiModel):
    can_open: bool
    can_rename: bool
    can_move: bool
    can_delete: bool
    can_retry: bool


class BoardSummaryResponse(ApiModel):
    id: int
    folder: FolderRef
    title: str
    status: BoardStatus
    failed_reason: Optional[str] = None
    media_duration_sec: Optional[int] = Field(default=None, ge=0)
    created_at: datetime
    updated_at: datetime
    progress: Optional[ProcessingProgress] = None
    actions: Optional[BoardActions] = None


class BoardListResponse(PageResponse):
    items: list[BoardSummaryResponse]



class BoardAssetResponse(ApiModel):
    asset_id: int
    filename: str
    mime_type: str
    url: str


# PDF 목록 응답용 스키마
class PdfAssetListResponse(ApiModel):
    items: list[BoardAssetResponse]


class MediaAssetResponse(BoardAssetResponse):
    duration_sec: Optional[int] = Field(default=None, ge=0)


class SegmentResponse(ApiModel):
    id: int
    seq: int = Field(ge=1)
    start_ms: int = Field(ge=0)
    end_ms: int = Field(gt=0)
    text: str
    source_type: TranscriptSourceType
    updated_at: datetime

    @model_validator(mode="after")
    def validate_time_range(self) -> "SegmentResponse":
        if self.end_ms <= self.start_ms:
            raise ValueError("end_ms는 start_ms보다 커야 합니다.")
        return self


class BoardDetailResponse(ApiModel):
    id: int
    folder: FolderRef
    title: str
    status: BoardStatus
    failed_reason: Optional[str] = None
    media: Optional[MediaAssetResponse] = None
    pdf: Optional[BoardAssetResponse] = None
    progress: Optional[ProcessingProgress] = None
    segments: list[SegmentResponse]
    created_at: datetime
    updated_at: datetime


class BoardStatusResponse(ApiModel):
    board_id: int
    status: BoardStatus
    stage: str  # API 응답은 alias 문자열로 반환
    progress_percent: int = Field(ge=0, le=100)
    message: Optional[str] = None
    failed_reason: Optional[str] = None
    updated_at: datetime


class BoardUploadRequest(ApiModel):
    folder_name: str = Field(min_length=1, max_length=200)
    board_title: str = Field(min_length=1, max_length=200)

    @field_validator("folder_name", "board_title")
    @classmethod
    def validate_not_blank(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("필수 문자열 필드는 공백일 수 없습니다.")
        return trimmed


class BoardUploadResponse(ApiModel):
    board_id: int
    status: BoardStatus
    folder: FolderRef
    processing_job: ProcessingProgress


class BoardListQuery(ApiModel):
    folder_id: Optional[int] = Field(default=None, ge=1)
    status: Optional[BoardStatus] = None
    q: Optional[str] = Field(default=None, max_length=200)
    page: int = Field(default=1, ge=1)
    size: int = Field(default=20, ge=1, le=100)

    @field_validator("q")
    @classmethod
    def normalize_q(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None


class BoardUpdateRequest(ApiModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    folder_id: Optional[int] = Field(default=None, ge=1)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("title은 공백일 수 없습니다.")
        return trimmed

    @model_validator(mode="after")
    def at_least_one_field(self) -> "BoardUpdateRequest":
        if self.title is None and self.folder_id is None:
            raise ValueError("title 또는 folder_id 중 하나는 필수입니다.")
        return self


class BoardUpdateResponse(ApiModel):
    id: int
    folder: FolderRef
    title: str
    status: BoardStatus
    updated_at: datetime


class BoardRetryResponse(ApiModel):
    id: int
    status: BoardStatus
    action: str
    processing_job: ProcessingProgress