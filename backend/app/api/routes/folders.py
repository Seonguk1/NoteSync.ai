from __future__ import annotations

from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user_id
from app.db.session import get_db
from app.schemas.folder import (
    FolderCreateRequest,
    FolderCreateResponse,
    FolderListResponse,
    FolderUpdateRequest,
    FolderUpdateResponse,
)
from app.services.folder_service import folder_service


router = APIRouter(prefix="/folders", tags=["folders"])


@router.post("", response_model=FolderCreateResponse, status_code=status.HTTP_201_CREATED)
def create_folder(
    payload: FolderCreateRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> FolderCreateResponse:
    return folder_service.create_folder(db=db, user_id=user_id, payload=payload)


@router.get("", response_model=FolderListResponse)
def list_folders(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> FolderListResponse:
    return folder_service.list_folders(db=db, user_id=user_id)


@router.patch("/{folder_id}", response_model=FolderUpdateResponse)
def update_folder(
    payload: FolderUpdateRequest,
    folder_id: int = Path(ge=1),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> FolderUpdateResponse:
    return folder_service.update_folder(db=db, user_id=user_id, folder_id=folder_id, payload=payload)


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
    folder_id: int = Path(ge=1),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> None:
    folder_service.delete_folder(db=db, user_id=user_id, folder_id=folder_id)