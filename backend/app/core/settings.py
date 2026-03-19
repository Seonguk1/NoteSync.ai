from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

def _parse_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}

def _default_sqlite_url() -> str:
    backend_dir = Path(__file__).resolve().parents[2]
    db_path = backend_dir / ".data" / "notesync.db"
    return f"sqlite+pysqlite:///{db_path.as_posix()}"

@dataclass(frozen=True)
class Settings:
    database_url: str
    sqlalchemy_echo: bool
    sqlalchemy_pool_pre_ping: bool
    upload_root: Path
    media_max_bytes: int
    pdf_max_bytes: int
    ai_pipeline_mode: str
    
    # 💡 로컬 Whisper 설정 삭제 및 Groq/STT 설정으로 교체
    groq_api_key: str
    stt_model_name: str 
    
    gemini_api_key: str
    gemini_model_name: str
    pdf_keyword_count: int
    processing_timeout_sec: int

@lru_cache
def get_settings() -> Settings:
    backend_dir = Path(__file__).resolve().parents[2]
    env_path = backend_dir / ".env"
    load_dotenv(dotenv_path=env_path)

    database_url = os.getenv("NOTESYNC_DATABASE_URL", _default_sqlite_url())
    sqlalchemy_echo = _parse_bool(os.getenv("SQLALCHEMY_ECHO"), default=False)
    sqlalchemy_pool_pre_ping = _parse_bool(os.getenv("SQLALCHEMY_POOL_PRE_PING"), default=True)
    upload_root = Path(os.getenv("NOTESYNC_UPLOAD_ROOT", str(backend_dir / ".uploads"))).expanduser()
    media_max_bytes = int(os.getenv("NOTESYNC_MEDIA_MAX_BYTES", str(2 * 1024 * 1024 * 1024)))
    pdf_max_bytes = int(os.getenv("NOTESYNC_PDF_MAX_BYTES", str(100 * 1024 * 1024)))
    ai_pipeline_mode = os.getenv("NOTESYNC_AI_PIPELINE_MODE", "real").strip().lower()
    
    # 💡 Groq API Key 및 STT 모델 설정
    groq_api_key = os.getenv("NOTESYNC_GROQ_API_KEY", "")
    stt_model_name = os.getenv("NOTESYNC_STT_MODEL_NAME", "whisper-large-v3-turbo")
    
    gemini_api_key = os.getenv("NOTESYNC_GEMINI_API_KEY", "")
    gemini_model_name = os.getenv("NOTESYNC_GEMINI_MODEL_NAME", "gemini-2.5-flash")
    pdf_keyword_count = int(os.getenv("NOTESYNC_PDF_KEYWORD_COUNT", "50"))
    processing_timeout_sec = int(os.getenv("NOTESYNC_PROCESSING_TIMEOUT_SEC", "3600"))
    
    return Settings(
        database_url=database_url,
        sqlalchemy_echo=sqlalchemy_echo,
        sqlalchemy_pool_pre_ping=sqlalchemy_pool_pre_ping,
        upload_root=upload_root,
        media_max_bytes=media_max_bytes,
        pdf_max_bytes=pdf_max_bytes,
        ai_pipeline_mode=ai_pipeline_mode,
        groq_api_key=groq_api_key,
        stt_model_name=stt_model_name,
        gemini_api_key=gemini_api_key,
        gemini_model_name=gemini_model_name,
        pdf_keyword_count=pdf_keyword_count,
        processing_timeout_sec=processing_timeout_sec,
    )