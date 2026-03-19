from __future__ import annotations

from typing import Any


class AppException(Exception):
    def __init__(self, status_code: int, code: str, message: str, details: Any = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


class DuplicateFolderNameError(AppException):
    def __init__(self) -> None:
        super().__init__(409, "DUPLICATE_FOLDER_NAME", "동일한 이름의 폴더가 이미 존재합니다.")


class FolderNotFoundError(AppException):
    def __init__(self) -> None:
        super().__init__(404, "FOLDER_NOT_FOUND", "폴더를 찾을 수 없습니다.")


class FolderNotEmptyError(AppException):
    def __init__(self) -> None:
        super().__init__(409, "FOLDER_NOT_EMPTY", "보드가 포함된 폴더는 삭제할 수 없습니다.")


class BoardNotFoundError(AppException):
    def __init__(self) -> None:
        super().__init__(404, "BOARD_NOT_FOUND", "보드를 찾을 수 없습니다.")


class BoardLockedError(AppException):
    def __init__(self) -> None:
        super().__init__(409, "BOARD_LOCKED", "현재 상태에서는 보드를 수정할 수 없습니다.")


class InvalidSegmentUpdateError(AppException):
    def __init__(self, message: str) -> None:
        super().__init__(400, "INVALID_SEGMENT_UPDATE", message)


class InvalidBoardUpdateError(AppException):
    def __init__(self, message: str) -> None:
        super().__init__(400, "INVALID_BOARD_UPDATE", message)


class FileTooLargeError(AppException):
    def __init__(self, message: str) -> None:
        super().__init__(413, "FILE_TOO_LARGE", message)


class UnsupportedFileTypeError(AppException):
    def __init__(self, message: str) -> None:
        super().__init__(415, "UNSUPPORTED_FILE_TYPE", message)


class AssetNotFoundError(AppException):
    def __init__(self) -> None:
        super().__init__(404, "ASSET_NOT_FOUND", "파일 자산을 찾을 수 없습니다.")


class BoardNotRetryableError(AppException):
    def __init__(self) -> None:
        super().__init__(409, "BOARD_NOT_RETRYABLE", "현재 상태의 보드는 재시도할 수 없습니다.")


class PipelineConfigurationError(AppException):
    def __init__(self, message: str) -> None:
        super().__init__(500, "PIPELINE_CONFIGURATION_ERROR", message)


class PdfExtractionError(AppException):
    def __init__(self, message: str) -> None:
        super().__init__(500, "PDF_EXTRACTION_ERROR", message)


class SttProcessingError(AppException):
    def __init__(self, message: str) -> None:
        super().__init__(500, "STT_PROCESSING_ERROR", message)


class PostprocessRefinementError(AppException):
    def __init__(self, message: str) -> None:
        super().__init__(500, "POSTPROCESS_REFINEMENT_ERROR", message)


class TimestampInvariantError(AppException):
    def __init__(self, message: str) -> None:
        super().__init__(500, "TIMESTAMP_INVARIANT_ERROR", message)