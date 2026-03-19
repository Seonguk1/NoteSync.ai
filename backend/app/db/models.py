from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, CreatedAtMixin, TimestampMixin
from .enums import AssetType, BoardStatus, TranscriptSourceType


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("length(trim(display_name)) > 0", name="display_name_not_blank"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)

    folders: Mapped[list[Folder]] = relationship(back_populates="user", cascade="all, delete-orphan")
    boards: Mapped[list[Board]] = relationship(back_populates="user", cascade="all, delete-orphan")
    board_assets: Mapped[list[BoardAsset]] = relationship(back_populates="user", cascade="all, delete-orphan")
    processing_jobs: Mapped[list[ProcessingJob]] = relationship(back_populates="user", cascade="all, delete-orphan")
    transcript_segments: Mapped[list[TranscriptSegment]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Folder(TimestampMixin, Base):
    __tablename__ = "folders"
    __table_args__ = (
        CheckConstraint("length(trim(name)) > 0", name="name_not_blank"),
        UniqueConstraint("user_id", "name", name="uq_folders_user_id_name"),
        Index("ix_folders_user_id_name", "user_id", "name"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)

    user: Mapped[User] = relationship(back_populates="folders")
    boards: Mapped[list[Board]] = relationship(back_populates="folder")


class Board(TimestampMixin, Base):
    __tablename__ = "boards"
    __table_args__ = (
        CheckConstraint("length(trim(title)) > 0", name="title_not_blank"),
        CheckConstraint("media_duration_sec IS NULL OR media_duration_sec >= 0", name="media_duration_non_negative"),
        Index("ix_boards_user_id_folder_id_created_at", "user_id", "folder_id", "created_at"),
        Index("ix_boards_user_id_status_created_at", "user_id", "status", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    folder_id: Mapped[int] = mapped_column(ForeignKey("folders.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    media_duration_sec: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[BoardStatus] = mapped_column(
        Enum(BoardStatus, native_enum=False, validate_strings=True),
        default=BoardStatus.QUEUED,
        server_default=BoardStatus.QUEUED.value,
        nullable=False,
    )
    failed_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    user: Mapped[User] = relationship(back_populates="boards")
    folder: Mapped[Folder] = relationship(back_populates="boards")
    assets: Mapped[list[BoardAsset]] = relationship(back_populates="board", cascade="all, delete-orphan")
    processing_jobs: Mapped[list[ProcessingJob]] = relationship(
        back_populates="board",
        cascade="all, delete-orphan",
        order_by="ProcessingJob.created_at.desc()",
    )
    transcript_segments: Mapped[list[TranscriptSegment]] = relationship(
        back_populates="board",
        cascade="all, delete-orphan",
        order_by="TranscriptSegment.seq.asc()",
    )


class BoardAsset(CreatedAtMixin, Base):
    __tablename__ = "board_assets"
    __table_args__ = (
        CheckConstraint("length(trim(original_filename)) > 0", name="original_filename_not_blank"),
        CheckConstraint("length(trim(mime_type)) > 0", name="mime_type_not_blank"),
        CheckConstraint("length(trim(storage_key)) > 0", name="storage_key_not_blank"),
        CheckConstraint("byte_size >= 0", name="byte_size_non_negative"),
        UniqueConstraint("board_id", "asset_type", name="uq_board_assets_board_id_asset_type"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    board_id: Mapped[int] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    asset_type: Mapped[AssetType] = mapped_column(
        Enum(AssetType, native_enum=False, validate_strings=True),
        nullable=False,
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(255), nullable=False)
    byte_size: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)

    board: Mapped[Board] = relationship(back_populates="assets")
    user: Mapped[User] = relationship(back_populates="board_assets")



# 파이프라인 Resume 요구사항에 맞춘 ProcessingJob 리팩토링
from sqlalchemy.sql import func # 👈 추가된 임포트
from .enums import PipelineStage, JobStatus

class ProcessingJob(Base):
    __tablename__ = "processing_jobs"
    __table_args__ = (
        Index("ix_processing_jobs_board_id_created_at", "board_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    board_id: Mapped[int] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"), nullable=False)
    
    # 👈 추가: User 테이블과의 관계성을 위한 FK 연결
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False) 

    stage: Mapped[PipelineStage] = mapped_column(
        Enum(PipelineStage, native_enum=False, validate_strings=True),
        default=PipelineStage.UPLOADED,
        nullable=False,
    )
    progress_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    message: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, native_enum=False, validate_strings=True),
        default=JobStatus.PENDING,
        nullable=False,
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    draft_data_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    board: Mapped[Board] = relationship(back_populates="processing_jobs")
    # 👈 추가: User 테이블과의 쌍방향 릴레이션 완성
    user: Mapped[User] = relationship(back_populates="processing_jobs")


class TranscriptSegment(TimestampMixin, Base):
    __tablename__ = "transcript_segments"
    __table_args__ = (
        CheckConstraint("length(trim(text)) > 0", name="text_not_blank"),
        CheckConstraint("seq >= 1", name="seq_positive"),
        CheckConstraint("start_ms >= 0", name="start_ms_non_negative"),
        CheckConstraint("end_ms > start_ms", name="end_ms_gt_start_ms"),
        UniqueConstraint("board_id", "seq", name="uq_transcript_segments_board_id_seq"),
        Index("ix_transcript_segments_board_id_seq", "board_id", "seq"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    board_id: Mapped[int] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    seq: Mapped[int] = mapped_column(nullable=False)
    start_ms: Mapped[int] = mapped_column(nullable=False)
    end_ms: Mapped[int] = mapped_column(nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    source_type: Mapped[TranscriptSourceType] = mapped_column(
        Enum(TranscriptSourceType, native_enum=False, validate_strings=True),
        default=TranscriptSourceType.STT_DRAFT,
        server_default=TranscriptSourceType.STT_DRAFT.value,
        nullable=False,
    )

    board: Mapped[Board] = relationship(back_populates="transcript_segments")
    user: Mapped[User] = relationship(back_populates="transcript_segments")