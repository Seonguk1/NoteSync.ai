# app/models/keyword.py


from typing import Optional

from sqlmodel import Field, SQLModel


class Keyword(SQLModel, table=True):
    __tablename__ = "keyword"

    id: Optional[int] = Field(default=None, primary_key=True)
    word: str
    session_id: Optional[int] = Field(default=None, foreign_key="session.id")