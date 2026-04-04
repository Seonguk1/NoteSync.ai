# app/schemas/content.py

from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel


# -----------------------------
# Material
# -----------------------------
class MaterialRead(SQLModel):
    id: int
    type: str
    original_name: str
    relative_path: Optional[str] = None
    file_url: Optional[str] = None
    status: str
    created_at: datetime
    session_id: Optional[int] = None


class MaterialUploadResponse(SQLModel):
    message: str
    material_id: int
    type: str
    status: Optional[str] = None
    batch_id: Optional[str] = None

class MaterialUpdate(SQLModel):
    original_name: Optional[str] = None

# -----------------------------
# Transcript
# -----------------------------
class TranscriptRead(SQLModel):
    id: int
    start_time: float
    end_time: float
    content: str
    is_edited: bool
    material_id: Optional[int] = None


class TranscriptUpdate(SQLModel):
    content: Optional[str] = None


# -----------------------------
# Keyword
# -----------------------------
class KeywordRead(SQLModel):
    id: int
    word: str
    session_id: Optional[int] = None


# -----------------------------
# Note
# -----------------------------
class NoteCreate(SQLModel):
    title: str
    content: str = ""


class NoteRead(SQLModel):
    id: int
    material_id: int
    session_id: Optional[int] = None
    title: str
    content: str
    created_at: datetime
    updated_at: datetime


class NoteUpdate(SQLModel):
    title: Optional[str] = None
    content: Optional[str] = None


# -----------------------------
# Annotation
# -----------------------------
class AnnotationCreate(SQLModel):
    page: int
    x_rel: float
    y_rel: float
    w_rel: Optional[float] = None
    h_rel: Optional[float] = None
    text: str
    type: Optional[str] = "comment"
    author_id: Optional[int] = None


class AnnotationRead(SQLModel):
    id: int
    material_id: int
    page: int
    x_rel: float
    y_rel: float
    w_rel: Optional[float] = None
    h_rel: Optional[float] = None
    text: str
    type: str
    author_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class AnnotationUpdate(SQLModel):
    text: Optional[str] = None
    x_rel: Optional[float] = None
    y_rel: Optional[float] = None
    w_rel: Optional[float] = None
    h_rel: Optional[float] = None
    type: Optional[str] = None