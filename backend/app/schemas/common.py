from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ErrorResponse(ApiModel):
    code: str
    message: str
    details: Any = None


class PageResponse(ApiModel):
    page: int = Field(ge=1)
    size: int = Field(ge=1, le=100)
    total: int = Field(ge=0)


class Timestamped(ApiModel):
    created_at: datetime
    updated_at: datetime