from __future__ import annotations

from fastapi import APIRouter, Depends, Path
from fastapi import Query
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user_id
from app.db.session import get_db
from app.services.file_service import file_service
from app.schemas.board import BoardAssetResponse, PdfAssetListResponse


router = APIRouter(prefix="/files", tags=["files"])


# PDF 파일 목록 조회 API
@router.get("/pdfs", response_model=PdfAssetListResponse)
def list_pdf_files(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> PdfAssetListResponse:
    pdf_assets = file_service.list_pdf_assets(db=db, user_id=user_id)
    items = [
        BoardAssetResponse(
            asset_id=asset.id,
            filename=asset.original_filename,
            mime_type=asset.mime_type,
            url=f"/files/{asset.id}"
        )
        for asset in pdf_assets
    ]
    return PdfAssetListResponse(items=items)

@router.get("/{asset_id}", response_class=FileResponse)
def get_file(
    asset_id: int = Path(ge=1),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> FileResponse:
    return file_service.get_file_response(db=db, user_id=user_id, asset_id=asset_id)