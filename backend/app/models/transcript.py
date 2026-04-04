# app/models/transcript.py


from typing import Optional, TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.material import Material


class Transcript(SQLModel, table=True):
    __tablename__ = "transcript"

    id: Optional[int] = Field(default=None, primary_key=True)
    start_time: float  # 시작 시간(초)
    end_time: float  # 종료 시간(초)
    content: str  # 자막 내용
    is_edited: bool = Field(default=False)  # 사용자 직접 수정 여부

    material_id: Optional[int] = Field(default=None, foreign_key="material.id")
    material: Optional["Material"] = Relationship(back_populates="transcripts")