# backend/app/api/v1/academic.py

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models import Term, Course, Session as DBSession, Material
from app.schemas import (
    TermCreate,
    TermRead,
    TermUpdate,
    CourseCreate,
    CourseRead,
    CourseUpdate,
    SessionCreate,
    SessionRead,
    SessionUpdate,
)

router = APIRouter()


# ----------------------------------------------------------------
# helper
# ----------------------------------------------------------------
def to_term_read(term: Term) -> TermRead:
    return TermRead(
        id=term.id,
        name=term.name,
    )


def to_course_read(course: Course) -> CourseRead:
    return CourseRead(
        id=course.id,
        name=course.name,
        term_id=course.term_id,
    )


def to_session_read(session: DBSession) -> SessionRead:
    return SessionRead(
        id=session.id,
        name=session.name,
        course_id=session.course_id,
    )


# ----------------------------------------------------------------
# 1. 학기 (Term)
# ----------------------------------------------------------------
@router.get("/terms", response_model=List[TermRead])
def get_terms(db: Session = Depends(get_session)):
    terms = db.exec(select(Term)).all()
    return [to_term_read(term) for term in terms]


@router.post("/terms", response_model=TermRead)
def create_term(request: TermCreate, db: Session = Depends(get_session)):
    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="학기 이름이 비어 있습니다.")

    new_term = Term(name=name)
    db.add(new_term)
    db.commit()
    db.refresh(new_term)

    return to_term_read(new_term)


@router.patch("/terms/{term_id}", response_model=TermRead)
def update_term(term_id: int, request: TermUpdate, db: Session = Depends(get_session)):
    term = db.get(Term, term_id)
    if not term:
        raise HTTPException(status_code=404, detail="해당 학기를 찾을 수 없습니다.")

    if request.name is not None:
        name = request.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="학기 이름이 비어 있습니다.")
        term.name = name

    db.add(term)
    db.commit()
    db.refresh(term)

    return to_term_read(term)


@router.delete("/terms/{term_id}")
def delete_term(term_id: int, db: Session = Depends(get_session)):
    term = db.get(Term, term_id)
    if not term:
        raise HTTPException(status_code=404, detail="해당 학기를 찾을 수 없습니다.")

    child_courses = db.exec(select(Course).where(Course.term_id == term_id)).all()
    if child_courses:
        raise HTTPException(
            status_code=400,
            detail="하위 강의가 있어 학기를 삭제할 수 없습니다. 먼저 강의를 정리해주세요.",
        )

    term_name = term.name
    db.delete(term)
    db.commit()

    return {"message": f"'{term_name}' 학기가 삭제되었습니다."}


# ----------------------------------------------------------------
# 2. 강의 (Course)
# ----------------------------------------------------------------
@router.get("/terms/{term_id}/courses", response_model=List[CourseRead])
def get_courses(term_id: int, db: Session = Depends(get_session)):
    courses = db.exec(select(Course).where(Course.term_id == term_id)).all()
    return [to_course_read(course) for course in courses]


@router.post("/courses", response_model=CourseRead)
def create_course(request: CourseCreate, db: Session = Depends(get_session)):
    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="강의 이름이 비어 있습니다.")

    if request.term_id is None:
        raise HTTPException(status_code=400, detail="term_id가 필요합니다.")

    term = db.get(Term, request.term_id)
    if not term:
        raise HTTPException(status_code=404, detail="상위 학기를 찾을 수 없습니다.")

    new_course = Course(
        name=name,
        term_id=request.term_id,
    )
    db.add(new_course)
    db.commit()
    db.refresh(new_course)

    return to_course_read(new_course)


@router.patch("/courses/{course_id}", response_model=CourseRead)
def update_course(course_id: int, request: CourseUpdate, db: Session = Depends(get_session)):
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="해당 강의를 찾을 수 없습니다.")

    if request.name is not None:
        name = request.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="강의 이름이 비어 있습니다.")
        course.name = name

    db.add(course)
    db.commit()
    db.refresh(course)

    return to_course_read(course)


@router.delete("/courses/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_session)):
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="해당 강의를 찾을 수 없습니다.")

    child_sessions = db.exec(select(DBSession).where(DBSession.course_id == course_id)).all()
    if child_sessions:
        raise HTTPException(
            status_code=400,
            detail="하위 세션이 있어 강의를 삭제할 수 없습니다. 먼저 세션을 정리해주세요.",
        )

    course_name = course.name
    db.delete(course)
    db.commit()

    return {"message": f"'{course_name}' 강의가 삭제되었습니다."}


# ----------------------------------------------------------------
# 3. 세션 (Session)
# ----------------------------------------------------------------
@router.get("/courses/{course_id}/sessions", response_model=List[SessionRead])
def get_sessions(course_id: int, db: Session = Depends(get_session)):
    sessions = db.exec(select(DBSession).where(DBSession.course_id == course_id)).all()
    return [to_session_read(session) for session in sessions]


@router.post("/sessions", response_model=SessionRead)
def create_session(request: SessionCreate, db: Session = Depends(get_session)):
    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="세션 이름이 비어 있습니다.")

    if request.course_id is None:
        raise HTTPException(status_code=400, detail="course_id가 필요합니다.")

    course = db.get(Course, request.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="상위 강의를 찾을 수 없습니다.")

    new_session = DBSession(
        name=name,
        course_id=request.course_id,
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return to_session_read(new_session)


@router.patch("/sessions/{session_id}", response_model=SessionRead)
def update_session(session_id: int, request: SessionUpdate, db: Session = Depends(get_session)):
    session = db.get(DBSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="해당 세션을 찾을 수 없습니다.")

    if request.name is not None:
        name = request.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="세션 이름이 비어 있습니다.")
        session.name = name

    db.add(session)
    db.commit()
    db.refresh(session)

    return to_session_read(session)


@router.delete("/sessions/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_session)):
    session = db.get(DBSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="해당 세션을 찾을 수 없습니다.")

    materials = db.exec(select(Material).where(Material.session_id == session_id)).all()
    if materials:
        raise HTTPException(
            status_code=400,
            detail="학습 자료가 남아 있어 세션을 삭제할 수 없습니다. 먼저 자료를 정리해주세요.",
        )

    session_name = session.name
    db.delete(session)
    db.commit()

    return {"message": f"'{session_name}' 세션이 삭제되었습니다."}