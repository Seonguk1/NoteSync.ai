from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import DuplicateFolderNameError, FolderNotEmptyError, FolderNotFoundError
from app.db.models import Board, Folder, User
from app.schemas.folder import (
    FolderCreateRequest,
    FolderCreateResponse,
    FolderItemResponse,
    FolderListResponse,
    FolderUpdateRequest,
    FolderUpdateResponse,
)


class FolderService:
    def create_folder(self, db: Session, user_id: int, payload: FolderCreateRequest) -> FolderCreateResponse:
        self._ensure_user_exists(db=db, user_id=user_id)

        existing_folder = db.execute(
            select(Folder).where(Folder.user_id == user_id, Folder.name == payload.name)
        ).scalar_one_or_none()
        if existing_folder is not None:
            raise DuplicateFolderNameError()

        folder = Folder(user_id=user_id, name=payload.name)
        db.add(folder)
        db.commit()
        db.refresh(folder)
        return FolderCreateResponse.model_validate(folder)

    def list_folders(self, db: Session, user_id: int) -> FolderListResponse:
        rows = db.execute(
            select(
                Folder.id,
                Folder.name,
                Folder.created_at,
                func.count(Board.id).label("board_count"),
            )
            .outerjoin(Board, Board.folder_id == Folder.id)
            .where(Folder.user_id == user_id)
            .group_by(Folder.id, Folder.name, Folder.created_at)
            .order_by(Folder.created_at.desc())
        ).all()

        items = [
            FolderItemResponse(
                id=row.id,
                name=row.name,
                board_count=row.board_count,
                created_at=row.created_at,
            )
            for row in rows
        ]
        return FolderListResponse(items=items)

    def update_folder(self, db: Session, user_id: int, folder_id: int, payload: FolderUpdateRequest) -> FolderUpdateResponse:
        folder = db.execute(
            select(Folder).where(Folder.id == folder_id, Folder.user_id == user_id)
        ).scalar_one_or_none()
        if folder is None:
            raise FolderNotFoundError()

        existing_folder = db.execute(
            select(Folder).where(
                Folder.user_id == user_id,
                Folder.name == payload.name,
                Folder.id != folder_id,
            )
        ).scalar_one_or_none()
        if existing_folder is not None:
            raise DuplicateFolderNameError()

        folder.name = payload.name
        folder.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(folder)
        return FolderUpdateResponse(
            id=folder.id,
            name=folder.name,
            created_at=folder.created_at,
            updated_at=folder.updated_at,
        )

    def delete_folder(self, db: Session, user_id: int, folder_id: int) -> None:
        folder = db.execute(
            select(Folder).where(Folder.id == folder_id, Folder.user_id == user_id)
        ).scalar_one_or_none()
        if folder is None:
            raise FolderNotFoundError()

        board_count = db.execute(
            select(func.count(Board.id)).where(Board.folder_id == folder.id, Board.user_id == user_id)
        ).scalar_one()

        if board_count > 0:
            raise FolderNotEmptyError()

        db.delete(folder)
        db.commit()

    def _ensure_user_exists(self, db: Session, user_id: int) -> None:
        user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
        if user is not None:
            return

        db.add(User(id=user_id, display_name=f"사용자 {user_id}"))
        db.flush()


folder_service = FolderService()