# app/models/term.py
from typing import List, Optional, TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.course import Course


class Term(SQLModel, table=True):
    __tablename__ = "term"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)  # 예: "2025-1 Semester"

    courses: List["Course"] = Relationship(back_populates="term")