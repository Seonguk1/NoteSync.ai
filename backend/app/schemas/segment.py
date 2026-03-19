from __future__ import annotations

from datetime import datetime

from pydantic import Field, field_validator, model_validator

from .common import ApiModel


class SegmentUpdateItem(ApiModel):
    id: int
    seq: int = Field(ge=1)
    start_ms: int = Field(ge=0)
    end_ms: int = Field(gt=0)
    text: str = Field(min_length=1)

    @field_validator("text")
    @classmethod
    def validate_text_not_blank(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("세그먼트 텍스트는 공백일 수 없습니다.")
        return trimmed

    @model_validator(mode="after")
    def validate_time_range(self) -> "SegmentUpdateItem":
        if self.end_ms <= self.start_ms:
            raise ValueError("end_ms는 start_ms보다 커야 합니다.")
        return self


class SegmentUpdateRequest(ApiModel):
    segments: list[SegmentUpdateItem] = Field(min_length=1)


class SegmentUpdateResponse(ApiModel):
    board_id: int
    saved_count: int = Field(ge=0)
    status: str
    updated_at: datetime