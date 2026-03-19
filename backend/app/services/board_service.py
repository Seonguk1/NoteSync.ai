from __future__ import annotations
from app.db.enums import AssetType, BoardStatus, PipelineStage, TranscriptSourceType, JobStatus

from collections.abc import Sequence

from datetime import datetime, timezone

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import (
    BoardLockedError,
    BoardNotFoundError,
    BoardNotRetryableError,
    InvalidBoardUpdateError,
    InvalidSegmentUpdateError,
)
from app.db.enums import AssetType, BoardStatus, PipelineStage, TranscriptSourceType
from app.db.models import Board, BoardAsset, Folder, ProcessingJob, TranscriptSegment
from app.schemas.board import (
    BoardActions,
    BoardAssetResponse,
    BoardDetailResponse,
    BoardListQuery,
    BoardListResponse,
    BoardRetryResponse,
    BoardStatusResponse,
    BoardSummaryResponse,
    BoardUpdateRequest,
    BoardUpdateResponse,
    FolderRef,
    MediaAssetResponse,
    ProcessingProgress,
    SegmentResponse,
)
from app.schemas.segment import SegmentUpdateRequest, SegmentUpdateResponse
from app.services.storage_service import storage_service


class BoardService:
    def list_boards(self, db: Session, user_id: int, query: BoardListQuery) -> BoardListResponse:
        filters = [Board.user_id == user_id]
        if query.folder_id is not None:
            filters.append(Board.folder_id == query.folder_id)
        if query.status is not None:
            filters.append(Board.status == query.status)
        if query.q is not None:
            filters.append(func.lower(Board.title).contains(query.q.lower()))

        total = db.execute(select(func.count(Board.id)).where(*filters)).scalar_one()
        processing_priority = case((Board.status.in_([BoardStatus.QUEUED, BoardStatus.PROCESSING, BoardStatus.POSTPROCESSING]), 0), else_=1)

        boards = db.execute(
            select(Board)
            .options(selectinload(Board.folder))
            .where(*filters)
            .order_by(processing_priority.asc(), Board.created_at.desc())
            .offset((query.page - 1) * query.size)
            .limit(query.size)
        ).scalars().all()

        latest_jobs = self._get_latest_jobs(db=db, board_ids=[board.id for board in boards])
        items = [self._build_board_summary(board=board, latest_job=latest_jobs.get(board.id)) for board in boards]
        return BoardListResponse(items=items, page=query.page, size=query.size, total=total)

    def get_board_detail(self, db: Session, user_id: int, board_id: int) -> BoardDetailResponse:
        board = db.execute(
            select(Board)
            .options(
                selectinload(Board.folder),
                selectinload(Board.assets),
                selectinload(Board.transcript_segments),
            )
            .where(Board.id == board_id, Board.user_id == user_id)
        ).scalar_one_or_none()
        if board is None:
            raise BoardNotFoundError()

        latest_job = self._get_latest_jobs(db=db, board_ids=[board.id]).get(board.id)
        media_asset = next((asset for asset in board.assets if asset.asset_type == AssetType.MEDIA), None)
        pdf_asset = next((asset for asset in board.assets if asset.asset_type == AssetType.PDF), None)

        return BoardDetailResponse(
            id=board.id,
            folder=FolderRef(id=board.folder.id, name=board.folder.name),
            title=board.title,
            status=board.status,
            failed_reason=board.failed_reason,
            media=self._build_media_asset_response(media_asset, board.media_duration_sec),
            pdf=self._build_asset_response(pdf_asset),
            progress=self._build_progress(board=board, latest_job=latest_job),
            segments=[
                SegmentResponse(
                    id=segment.id,
                    seq=segment.seq,
                    start_ms=segment.start_ms,
                    end_ms=segment.end_ms,
                    text=segment.text,
                    source_type=segment.source_type,
                    updated_at=segment.updated_at,
                )
                for segment in board.transcript_segments
            ],
            created_at=board.created_at,
            updated_at=board.updated_at,
        )

    def get_board_status(self, db: Session, user_id: int, board_id: int) -> BoardStatusResponse:
        board = db.execute(select(Board).where(Board.id == board_id, Board.user_id == user_id)).scalar_one_or_none()
        if board is None:
            raise BoardNotFoundError()

        latest_job = self._get_latest_jobs(db=db, board_ids=[board.id]).get(board.id)
        progress = self._build_progress(board=board, latest_job=latest_job)
        # 디버그 로그: 상태 조회 시 최신 작업/보드 상태 출력
        try:
            lj_info = f"id={latest_job.id}, stage={latest_job.stage}, percent={latest_job.progress_percent}, status={latest_job.status}"
        except Exception:
            lj_info = "no latest_job"
        print(f"[DEBUG] GET /boards/{board_id}/status -> board.status={board.status}, latest_job={lj_info}")
        
        return BoardStatusResponse(
            board_id=board.id,
            status=board.status,
            stage=progress.stage,
            # progress_percent와 message는 progress 객체에서 가져오도록 유지 (UI 호환성)
            progress_percent=progress.progress_percent,
            message=progress.message,
            failed_reason=board.failed_reason,
            updated_at=board.updated_at,
        )

    def update_segments(
        self,
        db: Session,
        user_id: int,
        board_id: int,
        payload: SegmentUpdateRequest,
    ) -> SegmentUpdateResponse:
        board = db.execute(
            select(Board)
            .options(selectinload(Board.transcript_segments))
            .where(Board.id == board_id, Board.user_id == user_id)
        ).scalar_one_or_none()
        if board is None:
            raise BoardNotFoundError()

        if board.status in {BoardStatus.QUEUED, BoardStatus.PROCESSING, BoardStatus.POSTPROCESSING}:
            raise BoardLockedError()

        existing_segments = sorted(board.transcript_segments, key=lambda segment: segment.seq)
        if len(existing_segments) != len(payload.segments):
            raise InvalidSegmentUpdateError("세그먼트 개수는 기존과 동일해야 합니다.")

        existing_by_id = {segment.id: segment for segment in existing_segments}
        seen_ids: set[int] = set()
        for update_item in payload.segments:
            existing = existing_by_id.get(update_item.id)
            if existing is None:
                raise InvalidSegmentUpdateError("보드에 속하지 않은 세그먼트가 포함되어 있습니다.")
            if update_item.id in seen_ids:
                raise InvalidSegmentUpdateError("중복된 세그먼트 id는 허용되지 않습니다.")
            seen_ids.add(update_item.id)
            if (
                existing.seq != update_item.seq
                or existing.start_ms != update_item.start_ms
                or existing.end_ms != update_item.end_ms
            ):
                raise InvalidSegmentUpdateError("id, seq, start_ms, end_ms는 기존 값과 동일해야 합니다.")

            existing.text = update_item.text
            existing.source_type = TranscriptSourceType.USER_EDITED

        board.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(board)
        return SegmentUpdateResponse(
            board_id=board.id,
            saved_count=len(payload.segments),
            status=board.status.value,
            updated_at=board.updated_at,
        )

    def update_board(
        self,
        db: Session,
        user_id: int,
        board_id: int,
        payload: BoardUpdateRequest,
    ) -> BoardUpdateResponse:
        board = db.execute(
            select(Board)
            .options(selectinload(Board.folder))
            .where(Board.id == board_id, Board.user_id == user_id)
        ).scalar_one_or_none()
        if board is None:
            raise BoardNotFoundError()

        if board.status in {BoardStatus.QUEUED, BoardStatus.PROCESSING, BoardStatus.POSTPROCESSING}:
            raise BoardLockedError()

        if payload.title is not None:
            board.title = payload.title

        if payload.folder_id is not None:
            folder = db.execute(
                select(Folder).where(Folder.id == payload.folder_id, Folder.user_id == user_id)
            ).scalar_one_or_none()
            if folder is None:
                raise InvalidBoardUpdateError("유효한 folder_id가 아닙니다.")
            board.folder_id = folder.id

        board.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(board)
        db.refresh(board, attribute_names=["folder"])
        return BoardUpdateResponse(
            id=board.id,
            folder=FolderRef(id=board.folder.id, name=board.folder.name),
            title=board.title,
            status=board.status,
            updated_at=board.updated_at,
        )

    def delete_board(self, db: Session, user_id: int, board_id: int) -> None:
        board = db.execute(
            select(Board)
            .options(selectinload(Board.assets))
            .where(Board.id == board_id, Board.user_id == user_id)
        ).scalar_one_or_none()
        if board is None:
            raise BoardNotFoundError()

        # 삭제하기 전에 storage_key들을 미리 백업해둡니다.
        storage_keys = [asset.storage_key for asset in board.assets]
        
        # 1. DB에서 보드(와 CASCADE로 묶인 BoardAsset)를 먼저 지웁니다.
        db.delete(board)
        db.commit()

        # 2. 물리적 파일 삭제 시, 방어 로직 (참조 카운팅) 적용!
        for storage_key in storage_keys:
            # 방금 보드를 지웠음에도 불구하고, 이 storage_key를 쓰는 Asset이 DB에 또 남아있나?
            usage_count = db.execute(
                select(func.count(BoardAsset.id))
                .where(BoardAsset.storage_key == storage_key)
            ).scalar_one()

            # 아무도 안 쓸 때만 진짜 물리적 파일을 삭제합니다.
            if usage_count == 0:
                storage_service.delete_file(storage_key)

    def retry_board(self, db: Session, user_id: int, board_id: int) -> BoardRetryResponse:
        board = db.execute(select(Board).where(Board.id == board_id, Board.user_id == user_id)).scalar_one_or_none()
        if board is None:
            raise BoardNotFoundError()
        if board.status != BoardStatus.FAILED:
            raise BoardNotRetryableError()

        board.status = BoardStatus.PROCESSING
        board.failed_reason = None
        board.updated_at = datetime.now(timezone.utc)
        
        # 💡 리팩토링된 ProcessingJob 생성 로직 (status 추가!)
        job = ProcessingJob(
            board_id=board.id,
            user_id=user_id,
            stage=PipelineStage.UPLOADED,      # 모델 필드명이 stage인 경우 그대로 유지
            status=JobStatus.PROCESSING,      # 👈 새로 추가된 status 필수 입력!
            progress_percent=0,               # 하위 호환성을 위해 유지
            message="재처리 대기 중",          # 하위 호환성을 위해 유지
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        # 파이프라인 재시작 트리거
        from app.services.pipeline_resume import resume_pipeline
        resume_pipeline(board.id, db)

        return BoardRetryResponse(
            id=board.id,
            status=board.status,
            action="재시도",
            processing_job=self._build_progress(board=board, latest_job=job),
        )

    def _get_latest_jobs(self, db: Session, board_ids: Sequence[int]) -> dict[int, ProcessingJob]:
        if not board_ids:
            return {}

        # 💡 SELECT 문에 정확한 컬럼들이 포함되도록 보장
        jobs = db.execute(
            select(ProcessingJob)
            .where(ProcessingJob.board_id.in_(board_ids))
            .order_by(ProcessingJob.board_id.asc(), ProcessingJob.created_at.desc(), ProcessingJob.id.desc())
        ).scalars().all()

        latest_jobs: dict[int, ProcessingJob] = {}
        for job in jobs:
            latest_jobs.setdefault(job.board_id, job)
        return latest_jobs

    def _build_board_summary(self, board: Board, latest_job: ProcessingJob | None) -> BoardSummaryResponse:
        return BoardSummaryResponse(
            id=board.id,
            folder=FolderRef(id=board.folder.id, name=board.folder.name),
            title=board.title,
            status=board.status,
            failed_reason=board.failed_reason,
            media_duration_sec=board.media_duration_sec,
            created_at=board.created_at,
            updated_at=board.updated_at,
            progress=self._build_progress(board=board, latest_job=latest_job),
            actions=self._build_actions(board.status),
        )

    def _build_progress(self, board: Board, latest_job: ProcessingJob | None) -> ProcessingProgress:
        if latest_job is not None:
            # 💡 Enum의 api_alias 속성을 사용하여 프론트엔드에 전달
            return ProcessingProgress(
                job_id=latest_job.id,
                stage=latest_job.stage.api_alias, # 👈 .value 대신 .api_alias 사용!
                progress_percent=latest_job.progress_percent,
                message=latest_job.message or (latest_job.error_message if latest_job.status == JobStatus.FAILED else None),
            )

        # Job이 없을 때의 Fallback
        fallback_stage = self._fallback_stage(board.status)
        return ProcessingProgress(
            job_id=0,
            stage=fallback_stage.api_alias,
            progress_percent=100 if board.status == BoardStatus.COMPLETED else 0,
            message=board.failed_reason,
        )

        # Job이 없을 때의 Fallback 로직
        stage = self._fallback_stage(board.status)
        return ProcessingProgress(
            job_id=0,
            stage=str(stage),
            progress_percent=100 if board.status == BoardStatus.COMPLETED else 0,
            message=board.failed_reason,
        )

    def _fallback_stage(self, status: BoardStatus) -> PipelineStage:
        mapping = {
            BoardStatus.QUEUED: PipelineStage.UPLOADED,
            BoardStatus.PROCESSING: PipelineStage.WHISPER_STT,
            BoardStatus.POSTPROCESSING: PipelineStage.AI_REFINEMENT,
            BoardStatus.COMPLETED: PipelineStage.COMPLETED,
            BoardStatus.FAILED: PipelineStage.COMPLETED,
        }
        return mapping[status]

    def _build_actions(self, status: BoardStatus) -> BoardActions:
        if status in {BoardStatus.QUEUED, BoardStatus.PROCESSING, BoardStatus.POSTPROCESSING}:
            return BoardActions(can_open=False, can_rename=False, can_move=False, can_delete=True, can_retry=False)
        if status == BoardStatus.FAILED:
            return BoardActions(can_open=True, can_rename=True, can_move=True, can_delete=True, can_retry=True)
        return BoardActions(can_open=True, can_rename=True, can_move=True, can_delete=True, can_retry=False)

    def _build_media_asset_response(self, asset: BoardAsset | None, duration_sec: int | None) -> MediaAssetResponse | None:
        if asset is None:
            return None
        return MediaAssetResponse(
            asset_id=asset.id,
            filename=asset.original_filename,
            mime_type=asset.mime_type,
            duration_sec=duration_sec,
            url=f"/files/{asset.id}",
        )

    def _build_asset_response(self, asset: BoardAsset | None) -> BoardAssetResponse | None:
        if asset is None:
            return None
        return BoardAssetResponse(
            asset_id=asset.id,
            filename=asset.original_filename,
            mime_type=asset.mime_type,
            url=f"/files/{asset.id}",
        )


board_service = BoardService()