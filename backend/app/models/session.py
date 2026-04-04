# app/models/session.py


from typing import List, Optional, TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.material import Material


class Session(SQLModel, table=True):
    __tablename__ = "session"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str  # 예: "Session 04: Bauhaus"
    course_id: Optional[int] = Field(default=None, foreign_key="course.id")

    course: Optional["Course"] = Relationship(back_populates="sessions")
    materials: List["Material"] = Relationship(back_populates="session")