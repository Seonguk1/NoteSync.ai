from datetime import datetime
from typing import List, Optional, TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.session import Session
    from app.models.transcript import Transcript
    from app.models.note import Note
    from app.models.annotation import Annotation


class Material(SQLModel, table=True):
    __tablename__ = "material"

    id: Optional[int] = Field(default=None, primary_key=True)
    type: str = Field(index=True)  # 'pdf', 'audio', 'video', 'note'
    original_name: str  # 업로드 당시 원본 파일명 또는 노트 제목
    relative_path: Optional[str] = None  # note는 None
    status: str = Field(default="READY")  # READY, PROCESSING, COMPLETED, FAILED, BLOCKED
    batch_id: Optional[str] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    session_id: Optional[int] = Field(default=None, foreign_key="session.id")
    session: Optional["Session"] = Relationship(back_populates="materials")
    transcripts: List["Transcript"] = Relationship(back_populates="material")
    note: Optional["Note"] = Relationship(back_populates="material")
    annotations: List["Annotation"] = Relationship(back_populates="material")