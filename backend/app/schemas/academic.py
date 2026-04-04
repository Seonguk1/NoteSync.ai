# app/schemas/academic.py

from __future__ import annotations

from typing import Optional

from sqlmodel import SQLModel


# -----------------------------
# Term
# -----------------------------
class TermCreate(SQLModel):
    name: str


class TermRead(SQLModel):
    id: int
    name: str


class TermUpdate(SQLModel):
    name: Optional[str] = None


# -----------------------------
# Course
# -----------------------------
class CourseCreate(SQLModel):
    name: str
    term_id: int


class CourseRead(SQLModel):
    id: int
    name: str
    term_id: Optional[int] = None


class CourseUpdate(SQLModel):
    name: Optional[str] = None
    term_id: Optional[int] = None


# -----------------------------
# Session
# -----------------------------
class SessionCreate(SQLModel):
    name: str
    course_id: int


class SessionRead(SQLModel):
    id: int
    name: str
    course_id: Optional[int] = None


class SessionUpdate(SQLModel):
    name: Optional[str] = None
    course_id: Optional[int] = None