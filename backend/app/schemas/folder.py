from __future__ import annotations

from datetime import datetime

from pydantic import Field, field_validator

from .common import ApiModel


class FolderCreateRequest(ApiModel):
    name: str = Field(min_length=1, max_length=200)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("폴더 이름은 공백일 수 없습니다.")
        return trimmed


class FolderItemResponse(ApiModel):
    id: int
    name: str
    board_count: int = Field(ge=0)
    created_at: datetime


class FolderCreateResponse(ApiModel):
    id: int
    name: str
    created_at: datetime


class FolderUpdateRequest(ApiModel):
    name: str = Field(min_length=1, max_length=200)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("폴더 이름은 공백일 수 없습니다.")
        return trimmed


class FolderUpdateResponse(ApiModel):
    id: int
    name: str
    created_at: datetime
    updated_at: datetime


class FolderListResponse(ApiModel):
    items: list[FolderItemResponse]