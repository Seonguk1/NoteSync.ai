# app/api/v1/content.py

import os
import shutil
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlmodel import Session, select
import uuid

from app.database import get_session
from app.orchestrator import orchestrator
from app.models import Material, Transcript, Keyword, Note, Annotation
from app.schemas import (
    KeywordRead,
    MaterialRead,
    MaterialUploadResponse,
    MaterialUpdate,
    TranscriptRead,
    TranscriptUpdate,
    NoteCreate,
    NoteRead,
    NoteUpdate,
    AnnotationCreate,
    AnnotationRead,
    AnnotationUpdate,
)

router = APIRouter()

MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB

DATA_ROOT = "data"
UPLOAD_SUBDIR = "uploads"
UPLOAD_ROOT = os.path.join(DATA_ROOT, UPLOAD_SUBDIR)
MEDIA_PREFIX = "/media"

SUPPORTED_EXTENSIONS = {
    ".pdf": "pdf",
    ".mp3": "audio",
    ".m4a": "audio",
    ".wav": "audio",
    ".mp4": "video",
    ".mkv": "video",
    ".avi": "video",
}


def normalize_relative_path(relative_path: Optional[str]) -> Optional[str]:
    if not relative_path:
        return None
    return relative_path.replace("\\", "/").lstrip("/")


def build_absolute_path(relative_path: Optional[str]) -> Optional[str]:
    normalized = normalize_relative_path(relative_path)
    if not normalized:
        return None
    return os.path.join(DATA_ROOT, normalized)


def build_file_url(relative_path: Optional[str]) -> Optional[str]:
    normalized = normalize_relative_path(relative_path)
    if not normalized:
        return None
    return f"{MEDIA_PREFIX}/{normalized}"


def to_material_read(material: Material) -> MaterialRead:
    return MaterialRead(
        id=material.id,
        type=material.type,
        original_name=material.original_name,
        relative_path=normalize_relative_path(material.relative_path),
        file_url=build_file_url(material.relative_path),
        status=material.status,
        created_at=material.created_at,
        session_id=material.session_id,
    )


def to_transcript_read(transcript: Transcript) -> TranscriptRead:
    return TranscriptRead(
        id=transcript.id,
        start_time=transcript.start_time,
        end_time=transcript.end_time,
        content=transcript.content,
        is_edited=transcript.is_edited,
        material_id=transcript.material_id,
    )


def to_keyword_read(keyword: Keyword) -> KeywordRead:
    return KeywordRead(
        id=keyword.id,
        word=keyword.word,
        session_id=keyword.session_id,
    )

def to_note_read(note: Note) -> NoteRead:
    if not note.material:
        raise HTTPException(status_code=500, detail="노트와 연결된 material 정보가 없습니다.")

    return NoteRead(
        id=note.id,
        material_id=note.material_id,
        session_id=note.material.session_id,
        title=note.material.original_name,
        content=note.content,
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


def to_annotation_read(annotation: Annotation) -> AnnotationRead:
    return AnnotationRead(
        id=annotation.id,
        material_id=annotation.material_id,
        page=annotation.page,
        x_rel=annotation.x_rel,
        y_rel=annotation.y_rel,
        w_rel=annotation.w_rel,
        h_rel=annotation.h_rel,
        text=annotation.text,
        type=annotation.type,
        author_id=annotation.author_id,
        created_at=annotation.created_at,
        updated_at=annotation.updated_at,
    )


async def _handle_batch_upload(session_id: int, files: List[UploadFile], db: Session):
    """배치 업로드 처리: 파일 저장, Material 생성, READY 항목 큐 등록."""
    if not files:
        raise HTTPException(status_code=400, detail="업로드할 파일이 없습니다.")

    file_metas = []
    for idx, file in enumerate(files):
        if not file.filename:
            raise HTTPException(status_code=400, detail="파일명이 비어 있습니다.")

        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in SUPPORTED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"지원하지 않는 확장자입니다: {ext}")

        file_type = SUPPORTED_EXTENSIONS[ext]

        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)

        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"파일 용량 초과 (제한: {MAX_FILE_SIZE / (1024 * 1024)}MB)",
            )

        original_name = os.path.basename(file.filename)
        file_metas.append(
            {
                "file": file,
                "original_name": original_name,
                "file_type": file_type,
                "ext": ext,
                "size": file_size,
                "index": idx,
            }
        )

    has_pdf = any(m["file_type"] == "pdf" for m in file_metas)
    os.makedirs(UPLOAD_ROOT, exist_ok=True)

    batch_id = uuid.uuid4().hex
    created_materials = []

    for m in file_metas:
        file = m["file"]
        original_name = m["original_name"]
        file_type = m["file_type"]
        idx = m["index"]

        stored_name = f"session_{session_id}_{batch_id}_{idx}_{original_name}"
        relative_path = f"{UPLOAD_SUBDIR}/{stored_name}".replace("\\", "/")
        absolute_path = os.path.join(DATA_ROOT, relative_path)

        with open(absolute_path, "wb") as buffer:
            file.file.seek(0)
            shutil.copyfileobj(file.file, buffer)

        status = "READY"
        if has_pdf and file_type in ["audio", "video"]:
            status = "BLOCKED"

        new_material = Material(
            original_name=original_name,
            type=file_type,
            session_id=session_id,
            relative_path=relative_path,
            status=status,
            batch_id=batch_id,
        )
        db.add(new_material)
        created_materials.append(new_material)

    db.commit()

    responses = []
    for new_material in created_materials:
        db.refresh(new_material)
        if new_material.status == "READY":
            await orchestrator.enqueue_material(new_material.id)

        responses.append(
            MaterialUploadResponse(
                message="파일 업로드 및 큐 등록 완료" if new_material.status == "READY" else "파일 업로드 완료(대기 중)",
                material_id=new_material.id,
                type=new_material.type,
                status=new_material.status,
                batch_id=new_material.batch_id,
            )
        )

    return responses

@router.post("/sessions/{session_id}/upload", response_model=MaterialUploadResponse)
async def upload_material(
    session_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
):
    """호환성 래퍼: 단일 파일을 배치 핸들러로 처리합니다."""
    results = await _handle_batch_upload(session_id, [file], db)
    return results[0]


@router.post("/sessions/{session_id}/uploads", response_model=List[MaterialUploadResponse])
async def upload_materials(
    session_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_session),
):
    """멀티파일 업로드 엔드포인트(배치)."""
    results = await _handle_batch_upload(session_id, files, db)
    return results


@router.get("/sessions/{session_id}/materials", response_model=List[MaterialRead])
def get_materials(session_id: int, db: Session = Depends(get_session)):
    """특정 주차(Session)에 업로드된 자료 목록을 가져옵니다."""
    materials = db.exec(
        select(Material).where(Material.session_id == session_id)
    ).all()

    return [to_material_read(material) for material in materials]

@router.patch("/materials/{material_id}", response_model=MaterialRead)
def update_material(
    material_id: int,
    request: MaterialUpdate,
    db: Session = Depends(get_session),
):
    material = db.get(Material, material_id)
    if not material:
        raise HTTPException(status_code=404, detail="자료를 찾을 수 없습니다.")

    if request.original_name is not None:
        new_name = request.original_name.strip()
        if not new_name:
            raise HTTPException(status_code=400, detail="자료 이름이 비어 있습니다.")
        material.original_name = new_name

    db.add(material)
    db.commit()
    db.refresh(material)

    return to_material_read(material)

@router.get("/materials/{material_id}/transcripts", response_model=List[TranscriptRead])
def get_transcripts(material_id: int, db: Session = Depends(get_session)):
    """특정 자료의 자막 목록을 시간 순서대로 정렬하여 가져옵니다."""
    transcripts = db.exec(
        select(Transcript)
        .where(Transcript.material_id == material_id)
        .order_by(Transcript.start_time)
    ).all()

    return [to_transcript_read(transcript) for transcript in transcripts]


@router.get("/materials/{material_id}/annotations", response_model=List[AnnotationRead])
def get_annotations(material_id: int, db: Session = Depends(get_session)):
    """특정 자료의 어노테이션 목록을 페이지 순으로 가져옵니다."""
    annotations = db.exec(
        select(Annotation).where(Annotation.material_id == material_id).order_by(Annotation.created_at)
    ).all()

    return [to_annotation_read(a) for a in annotations]


@router.post("/materials/{material_id}/annotations", response_model=AnnotationRead)
def create_annotation(material_id: int, request: AnnotationCreate, db: Session = Depends(get_session)):
    material = db.get(Material, material_id)
    if not material:
        raise HTTPException(status_code=404, detail="자료를 찾을 수 없습니다.")

    new_ann = Annotation(
        material_id=material_id,
        page=request.page,
        x_rel=request.x_rel,
        y_rel=request.y_rel,
        w_rel=request.w_rel,
        h_rel=request.h_rel,
        text=request.text,
        type=request.type or "comment",
        author_id=getattr(request, "author_id", None),
    )
    db.add(new_ann)
    db.commit()
    db.refresh(new_ann)

    return to_annotation_read(new_ann)


@router.put("/annotations/{annotation_id}", response_model=AnnotationRead)
def update_annotation(annotation_id: int, request: AnnotationUpdate, db: Session = Depends(get_session)):
    ann = db.get(Annotation, annotation_id)
    if not ann:
        raise HTTPException(status_code=404, detail="어노테이션을 찾을 수 없습니다.")

    if request.text is not None:
        ann.text = request.text
    if request.x_rel is not None:
        ann.x_rel = request.x_rel
    if request.y_rel is not None:
        ann.y_rel = request.y_rel
    if request.w_rel is not None:
        ann.w_rel = request.w_rel
    if request.h_rel is not None:
        ann.h_rel = request.h_rel
    if request.type is not None:
        ann.type = request.type

    ann.updated_at = datetime.utcnow()

    db.add(ann)
    db.commit()
    db.refresh(ann)

    return to_annotation_read(ann)


@router.delete("/annotations/{annotation_id}")
def delete_annotation(annotation_id: int, db: Session = Depends(get_session)):
    ann = db.get(Annotation, annotation_id)
    if not ann:
        raise HTTPException(status_code=404, detail="어노테이션을 찾을 수 없습니다.")

    db.delete(ann)
    db.commit()

    return {"message": "어노테이션이 삭제되었습니다."}


@router.get("/sessions/{session_id}/keywords", response_model=List[KeywordRead])
def get_keywords(session_id: int, db: Session = Depends(get_session)):
    """특정 주차(Session)의 추출된 핵심 키워드 목록을 가져옵니다."""
    keywords = db.exec(
        select(Keyword).where(Keyword.session_id == session_id)
    ).all()

    return [to_keyword_read(keyword) for keyword in keywords]


@router.put("/transcripts/{transcript_id}", response_model=TranscriptRead)
def update_transcript(
    transcript_id: int,
    request: TranscriptUpdate,
    db: Session = Depends(get_session),
):
    """사용자가 직접 수정한 자막 내용을 DB에 반영합니다."""
    transcript = db.get(Transcript, transcript_id)
    if not transcript:
        raise HTTPException(status_code=404, detail="자막을 찾을 수 없습니다.")

    if request.content is None or not request.content.strip():
        raise HTTPException(status_code=400, detail="수정할 자막 내용이 비어 있습니다.")

    transcript.content = request.content.strip()
    transcript.is_edited = True

    db.add(transcript)
    db.commit()
    db.refresh(transcript)

    return to_transcript_read(transcript)

@router.post("/sessions/{session_id}/notes", response_model=NoteRead)
def create_note(
    session_id: int,
    request: NoteCreate,
    db: Session = Depends(get_session),
):
    title = request.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="노트 제목이 비어 있습니다.")

    new_material = Material(
        type="note",
        original_name=title,
        relative_path=None,
        status="READY",
        session_id=session_id,
    )
    db.add(new_material)
    db.commit()
    db.refresh(new_material)

    new_note = Note(
        material_id=new_material.id,
        content=request.content,
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)

    # relationship 보장 위해 다시 조회
    note = db.exec(
        select(Note).where(Note.id == new_note.id)
    ).one()
    return to_note_read(note)

@router.get("/materials/{material_id}/note", response_model=NoteRead)
def get_note(material_id: int, db: Session = Depends(get_session)):
    note = db.exec(
        select(Note).join(Material).where(Note.material_id == material_id)
    ).first()

    if not note:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

    return to_note_read(note)

@router.put("/materials/{material_id}/note", response_model=NoteRead)
def update_note(
    material_id: int,
    request: NoteUpdate,
    db: Session = Depends(get_session),
):
    note = db.exec(
        select(Note).join(Material).where(Note.material_id == material_id)
    ).first()

    if not note:
        raise HTTPException(status_code=404, detail="노트를 찾을 수 없습니다.")

    material = note.material
    if not material:
        raise HTTPException(status_code=500, detail="노트와 연결된 material 정보가 없습니다.")

    if request.title is not None:
        title = request.title.strip()
        if not title:
            raise HTTPException(status_code=400, detail="노트 제목이 비어 있습니다.")
        material.original_name = title
        db.add(material)

    if request.content is not None:
        note.content = request.content

    note.updated_at = datetime.utcnow()

    db.add(note)
    db.commit()
    db.refresh(note)

    note = db.exec(
        select(Note).join(Material).where(Note.material_id == material_id)
    ).first()

    return to_note_read(note)

@router.delete("/materials/{material_id}")
def delete_material(material_id: int, db: Session = Depends(get_session)):
    """자료를 DB에서 삭제하고, 로컬 디스크의 실제 파일도 함께 제거합니다."""
    material = db.get(Material, material_id)
    if not material:
        raise HTTPException(status_code=404, detail="자료를 찾을 수 없습니다.")

    note = db.exec(select(Note).where(Note.material_id == material.id)).first()
    if note:
        db.delete(note)
        db.commit()

    absolute_path = build_absolute_path(material.relative_path)

    if absolute_path and os.path.exists(absolute_path):
        os.remove(absolute_path)

        base_dir = os.path.dirname(absolute_path)
        file_name = os.path.basename(absolute_path)
        name_without_ext = os.path.splitext(file_name)[0]
        audio_path = os.path.join(base_dir, f"{name_without_ext}_audio.mp3")

        if os.path.exists(audio_path):
            os.remove(audio_path)

    material_name = material.original_name

    db.delete(material)
    db.commit()

    return {"message": f"{material_name} 자료가 성공적으로 삭제되었습니다."}
