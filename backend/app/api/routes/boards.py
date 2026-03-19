from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Path, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user_id
from app.db.enums import BoardStatus
from app.db.session import get_db
from app.schemas.board import (
    BoardDetailResponse,
    BoardListQuery,
    BoardListResponse,
    BoardRetryResponse,
    BoardStatusResponse,
    BoardUpdateRequest,
    BoardUpdateResponse,
    BoardUploadRequest,
    BoardUploadResponse,
)
from app.schemas.segment import SegmentUpdateRequest, SegmentUpdateResponse
from app.services.board_service import board_service
from app.services.upload_service import upload_service


router = APIRouter(prefix="/boards", tags=["boards"])


@router.post("/upload", response_model=BoardUploadResponse, status_code=status.HTTP_202_ACCEPTED)
def upload_board(
    background_tasks: BackgroundTasks,
    folder_name: str = Form(...),
    board_title: str = Form(...),
    media_file: UploadFile = File(...),
    pdf_file: UploadFile | None = File(default=None),
    pdf_asset_id: int | None = Form(default=None),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> BoardUploadResponse:
    payload = BoardUploadRequest(folder_name=folder_name, board_title=board_title)
    return upload_service.create_upload(
        db=db,
        user_id=user_id,
        payload=payload,
        media_file=media_file,
        pdf_file=pdf_file,
        pdf_asset_id=pdf_asset_id,
        background_tasks=background_tasks,
    )


@router.get("", response_model=BoardListResponse)
def list_boards(
    folder_id: int | None = Query(default=None, ge=1),
    status: BoardStatus | None = Query(default=None),
    q: str | None = Query(default=None, max_length=200),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> BoardListResponse:
    query = BoardListQuery(folder_id=folder_id, status=status, q=q, page=page, size=size)
    return board_service.list_boards(db=db, user_id=user_id, query=query)


@router.get("/{board_id}", response_model=BoardDetailResponse)
def get_board_detail(
    board_id: int = Path(ge=1),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> BoardDetailResponse:
    return board_service.get_board_detail(db=db, user_id=user_id, board_id=board_id)


@router.get("/{board_id}/status", response_model=BoardStatusResponse)
def get_board_status(
    board_id: int = Path(ge=1),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> BoardStatusResponse:
    return board_service.get_board_status(db=db, user_id=user_id, board_id=board_id)


@router.put("/{board_id}/segments", response_model=SegmentUpdateResponse)
def update_board_segments(
    payload: SegmentUpdateRequest,
    board_id: int = Path(ge=1),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> SegmentUpdateResponse:
    return board_service.update_segments(db=db, user_id=user_id, board_id=board_id, payload=payload)


@router.patch("/{board_id}", response_model=BoardUpdateResponse)
def update_board(
    payload: BoardUpdateRequest,
    board_id: int = Path(ge=1),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> BoardUpdateResponse:
    return board_service.update_board(db=db, user_id=user_id, board_id=board_id, payload=payload)


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_board(
    board_id: int = Path(ge=1),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> None:
    board_service.delete_board(db=db, user_id=user_id, board_id=board_id)


@router.post("/{board_id}/retry", response_model=BoardRetryResponse)
def retry_board(
    board_id: int = Path(ge=1),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> BoardRetryResponse:
    return board_service.retry_board(db=db, user_id=user_id, board_id=board_id)