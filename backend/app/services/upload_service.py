from __future__ import annotations

from contextlib import contextmanager
from typing import Callable

from fastapi import BackgroundTasks, UploadFile
from sqlalchemy import select
from sqlalchemy.engine import Connection
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.exceptions import FileTooLargeError, UnsupportedFileTypeError
from app.core.settings import get_settings
from app.db.enums import AssetType, BoardStatus, PipelineStage, TranscriptSourceType, JobStatus
from app.db.models import Board, BoardAsset, Folder, ProcessingJob, TranscriptSegment, User
from app.schemas.board import BoardUploadRequest, BoardUploadResponse, FolderRef, ProcessingProgress
from app.services.ai_pipeline import PipelinePayload, build_ai_pipeline_from_settings
from app.services.storage_service import storage_service


class UploadService:
    def create_upload(
        self,
        *,
        db: Session,
        user_id: int,
        payload: BoardUploadRequest,
        media_file: UploadFile,
        pdf_file: UploadFile | None,
        pdf_asset_id: int | None = None,
        background_tasks: BackgroundTasks,
    ) -> BoardUploadResponse:
        self._ensure_user_exists(db=db, user_id=user_id)
        settings = get_settings()

        media_size = self._get_upload_size(media_file)
        if media_size > settings.media_max_bytes:
            raise FileTooLargeError("미디어 파일 크기가 제한을 초과했습니다.")

        if pdf_file is not None:
            self._validate_pdf_file(pdf_file)
            pdf_size = self._get_upload_size(pdf_file)
            if pdf_size > settings.pdf_max_bytes:
                raise FileTooLargeError("PDF 파일 크기가 제한을 초과했습니다.")

        folder = db.execute(
            select(Folder).where(Folder.user_id == user_id, Folder.name == payload.folder_name)
        ).scalar_one_or_none()
        if folder is None:
            folder = Folder(user_id=user_id, name=payload.folder_name)
            db.add(folder)
            db.flush()

        board = Board(user_id=user_id, folder_id=folder.id, title=payload.board_title, status=BoardStatus.QUEUED)
        db.add(board)
        db.flush()

        saved_media = storage_service.save_upload(upload_file=media_file, asset_type=AssetType.MEDIA)
        db.add(
            BoardAsset(
                board_id=board.id,
                user_id=user_id,
                asset_type=AssetType.MEDIA,
                original_filename=media_file.filename or "media",
                mime_type=media_file.content_type or "application/octet-stream",
                byte_size=saved_media.byte_size,
                storage_key=saved_media.storage_key,
            )
        )

        if pdf_file is not None:
            saved_pdf = storage_service.save_upload(upload_file=pdf_file, asset_type=AssetType.PDF)
            db.add(
                BoardAsset(
                    board_id=board.id,
                    user_id=user_id,
                    asset_type=AssetType.PDF,
                    original_filename=pdf_file.filename or "document.pdf",
                    mime_type=pdf_file.content_type or "application/pdf",
                    byte_size=saved_pdf.byte_size,
                    storage_key=saved_pdf.storage_key,
                )
            )
        elif pdf_asset_id is not None:
            # 사용자 보유 라이브러리에서 선택한 기존 PDF 자산을 새 Board에 연결
            existing = db.execute(
                select(BoardAsset).where(BoardAsset.id == pdf_asset_id, BoardAsset.asset_type == AssetType.PDF, BoardAsset.user_id == user_id)
            ).scalar_one_or_none()
            if existing:
                db.add(
                    BoardAsset(
                        board_id=board.id,
                        user_id=user_id,
                        asset_type=AssetType.PDF,
                        original_filename=existing.original_filename,
                        mime_type=existing.mime_type,
                        byte_size=existing.byte_size,
                        storage_key=existing.storage_key,
                    )
                )

        job = ProcessingJob(
            board_id=board.id,
            user_id=user_id,
            stage=PipelineStage.UPLOADED,
            progress_percent=0,
            message="업로드 완료, 처리 대기 중",
        )
        db.add(job)
        db.commit()
        db.refresh(folder)
        db.refresh(board)
        db.refresh(job)

        # BoardAsset 존재 여부 로그
        asset_count = db.query(BoardAsset).filter_by(board_id=board.id).count()
        print(f"[LOG] 업로드 커밋 직후 BoardAsset count: {asset_count}")

        background_tasks.add_task(self.run_pipeline, board.id, self._coerce_engine(db.get_bind()))
        return BoardUploadResponse(
            board_id=board.id,
            status=board.status,
            folder=FolderRef(id=folder.id, name=folder.name),
            processing_job=ProcessingProgress(
                job_id=job.id,
                stage=job.stage,
                progress_percent=job.progress_percent,
                message=job.message,
            ),
        )

    def run_pipeline(self, board_id: int, bind: Engine) -> None:
        with self._session_scope(bind) as db:
            board = db.execute(select(Board).where(Board.id == board_id)).scalar_one_or_none()
            if board is None:
                return

            job = db.execute(
                select(ProcessingJob)
                .where(ProcessingJob.board_id == board_id)
                .order_by(ProcessingJob.created_at.desc(), ProcessingJob.id.desc())
            ).scalars().first()
            if job is None:
                return

            assets = db.execute(select(BoardAsset).where(BoardAsset.board_id == board_id)).scalars().all()
            has_pdf = any(asset.asset_type == AssetType.PDF for asset in assets)
            media_asset = next((asset for asset in assets if asset.asset_type == AssetType.MEDIA), None)
            pdf_asset = next((asset for asset in assets if asset.asset_type == AssetType.PDF), None)
            settings = get_settings()
            pipeline = build_ai_pipeline_from_settings(settings)

            # BoardAsset 존재 여부 로그 (파이프라인 진입 시)
            asset_count = db.query(BoardAsset).filter_by(board_id=board_id).count()
            print(f"[LOG] 파이프라인 진입 시 BoardAsset count: {asset_count}")

            try:
                self._update_job(db, board, job, BoardStatus.PROCESSING, PipelineStage.UPLOADED, 5, "처리를 시작합니다.")

                def handle_progress(percent: int, message: str):
                    stage = PipelineStage.WHISPER_STT if percent < 85 else PipelineStage.AI_REFINEMENT
                    b_status = BoardStatus.PROCESSING if percent < 85 else BoardStatus.POSTPROCESSING
                    self._update_job(db, board, job, b_status, stage, percent, message)

                self._upsert_segments_from_pipeline(
                    db=db,
                    board=board,
                    media_asset=media_asset,
                    pdf_asset=pdf_asset,
                    pipeline=pipeline,
                    upload_root=settings.upload_root,
                    on_progress=handle_progress,
                )
                board.status = BoardStatus.COMPLETED
                board.failed_reason = None
                job.stage = PipelineStage.COMPLETED
                job.progress_percent = 100
                job.message = "처리가 완료되었습니다."
                job.status = JobStatus.COMPLETED
            except Exception as exc:
                # BoardAsset 존재 여부 로그 (에러/롤백 시)
                asset_count = db.query(BoardAsset).filter_by(board_id=board_id).count()
                print(f"[LOG] 파이프라인 에러/롤백 시 BoardAsset count: {asset_count}")
                board.status = BoardStatus.FAILED
                board.failed_reason = str(exc)
                job.stage = PipelineStage.COMPLETED
                job.progress_percent = 100
                job.message = "처리에 실패했습니다."
                job.status = JobStatus.FAILED
                db.commit()
                return

    def _upsert_segments_from_pipeline(
        self,
        *,
        db: Session,
        board: Board,
        media_asset: BoardAsset | None,
        pdf_asset: BoardAsset | None,
        pipeline,
        upload_root,
        on_progress: Callable[[int, str], None] | None = None,
    ) -> None:
        existing_segments = db.execute(select(TranscriptSegment).where(TranscriptSegment.board_id == board.id)).scalars().all()
        if existing_segments:
            return

        if media_asset is None:
            raise ValueError("미디어 자산이 존재하지 않습니다.")

        media_path = upload_root / media_asset.storage_key
        pdf_path = upload_root / pdf_asset.storage_key if pdf_asset is not None else None

        chunks = pipeline.process(
            PipelinePayload(
                media_path=media_path,
                pdf_path=pdf_path,
                board_title=board.title,
                on_progress=on_progress,
            )
        )

        for chunk in chunks:
            db.add(
                TranscriptSegment(
                    board_id=board.id,
                    user_id=board.user_id,
                    seq=chunk.seq,
                    start_ms=chunk.start_ms,
                    end_ms=chunk.end_ms,
                    text=chunk.text,
                    source_type=TranscriptSourceType.LLM_REFINED,
                )
            )

        if chunks:
            board.media_duration_sec = chunks[-1].end_ms // 1000

    def _update_job(
        self,
        db: Session,
        board: Board,
        job: ProcessingJob,
        board_status: BoardStatus,
        stage: PipelineStage,
        progress_percent: int,
        message: str,
    ) -> None:
        board.status = board_status
        job.stage = stage
        job.progress_percent = progress_percent
        job.message = message
        # job.status 매핑: board_status에 따라 JobStatus도 함께 업데이트
        try:
            if board_status == BoardStatus.PROCESSING:
                job.status = JobStatus.PROCESSING
            elif board_status == BoardStatus.COMPLETED:
                job.status = JobStatus.COMPLETED
            elif board_status == BoardStatus.FAILED:
                job.status = JobStatus.FAILED
        except Exception:
            pass
        db.commit()

    def _validate_pdf_file(self, upload_file: UploadFile) -> None:
        filename = (upload_file.filename or "").lower()
        content_type = (upload_file.content_type or "").lower()
        if not filename.endswith(".pdf") or content_type not in {"application/pdf", "application/x-pdf"}:
            raise UnsupportedFileTypeError("PDF 파일만 업로드할 수 있습니다.")

    def _get_upload_size(self, upload_file: UploadFile) -> int:
        current_position = upload_file.file.tell()
        upload_file.file.seek(0, 2)
        size = upload_file.file.tell()
        upload_file.file.seek(current_position)
        return size

    def _ensure_user_exists(self, db: Session, user_id: int) -> None:
        user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
        if user is not None:
            return
        db.add(User(id=user_id, display_name=f"사용자 {user_id}"))
        db.flush()

    def _coerce_engine(self, bind: Engine | Connection) -> Engine:
        if isinstance(bind, Engine):
            return bind
        return bind.engine

    @contextmanager
    def _session_scope(self, bind: Engine):
        session_factory = sessionmaker(
            bind=bind,
            autocommit=False,
            autoflush=False,
            expire_on_commit=False,
            class_=Session,
        )
        db = session_factory()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()


upload_service = UploadService()