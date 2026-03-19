from __future__ import annotations

from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AssetNotFoundError
from app.db.models import BoardAsset
from app.services.storage_service import storage_service


class FileService:
    def list_pdf_assets(self, db: Session, user_id: int) -> list[BoardAsset]:
        from app.db.enums import AssetType
        assets = db.execute(
            select(BoardAsset)
            .where(BoardAsset.user_id == user_id, BoardAsset.asset_type == AssetType.PDF)
            .order_by(BoardAsset.created_at.desc())
        ).scalars().all()

        # storage_key 기준으로 중복 제거 (가장 최근에 올린 것 하나만 보여줌)
        seen_keys = set()
        unique_assets = []
        for asset in assets:
            if asset.storage_key not in seen_keys:
                seen_keys.add(asset.storage_key)
                unique_assets.append(asset)
                
        return unique_assets
    
    def get_file_response(self, db: Session, user_id: int, asset_id: int) -> FileResponse:
        asset = db.execute(
            select(BoardAsset).where(BoardAsset.id == asset_id, BoardAsset.user_id == user_id)
        ).scalar_one_or_none()
        if asset is None:
            raise AssetNotFoundError()

        try:
            absolute_path = storage_service.resolve_path(asset.storage_key)
        except ValueError as exc:
            raise AssetNotFoundError() from exc

        if not absolute_path.exists() or not absolute_path.is_file():
            raise AssetNotFoundError()

        return FileResponse(
            path=absolute_path,
            media_type=asset.mime_type,
            filename=asset.original_filename,
        )


file_service = FileService()