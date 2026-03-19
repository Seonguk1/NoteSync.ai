from __future__ import annotations

import shutil
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.core.settings import get_settings
from app.db.enums import AssetType


@dataclass(frozen=True)
class SavedAsset:
    storage_key: str
    absolute_path: Path
    byte_size: int


class LocalStorageService:
    def save_upload(self, *, upload_file: UploadFile, asset_type: AssetType) -> SavedAsset:
        settings = get_settings()
        extension = Path(upload_file.filename or "").suffix.lower()
        safe_name = f"{uuid4().hex}{extension}"
        relative_path = Path(asset_type.value) / safe_name
        absolute_path = settings.upload_root / relative_path
        absolute_path.parent.mkdir(parents=True, exist_ok=True)

        upload_file.file.seek(0)
        with absolute_path.open("wb") as destination:
            shutil.copyfileobj(upload_file.file, destination)
        byte_size = absolute_path.stat().st_size
        upload_file.file.seek(0)
        return SavedAsset(
            storage_key=relative_path.as_posix(),
            absolute_path=absolute_path,
            byte_size=byte_size,
        )

    def resolve_path(self, storage_key: str) -> Path:
        settings = get_settings()
        normalized_key = Path(storage_key)
        absolute_path = (settings.upload_root / normalized_key).resolve()
        upload_root = settings.upload_root.resolve()
        if upload_root not in absolute_path.parents and absolute_path != upload_root:
            raise ValueError("잘못된 storage_key입니다.")
        return absolute_path

    def delete_file(self, storage_key: str) -> None:
        try:
            absolute_path = self.resolve_path(storage_key)
        except ValueError:
            return
        if absolute_path.exists() and absolute_path.is_file():
            absolute_path.unlink()


storage_service = LocalStorageService()