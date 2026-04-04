# app/models/course.py


from typing import List, Optional, TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.term import Term
    from app.models.session import Session


class Course(SQLModel, table=True):
    __tablename__ = "course"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)  # 예: "Modern Architecture"
    term_id: Optional[int] = Field(default=None, foreign_key="term.id")

    term: Optional["Term"] = Relationship(back_populates="courses")
    sessions: List["Session"] = Relationship(back_populates="course")