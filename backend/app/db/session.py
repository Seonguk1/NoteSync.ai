from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path
from typing import Generator, Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import Pool

from app.core.settings import get_settings


def _is_sqlite_url(database_url: str) -> bool:
    return database_url.startswith("sqlite")


def _sqlite_connect_args(database_url: str) -> dict[str, any]:
    if _is_sqlite_url(database_url):
        return {
            "check_same_thread": False,
            "timeout": 15  # 1. 락(Lock) 대기 시간을 15초로 늘려줍니다.
        }
    return {}


def _extract_sqlite_path(database_url: str) -> str | None:
    prefixes = ("sqlite+pysqlite:///", "sqlite:///")
    for prefix in prefixes:
        if database_url.startswith(prefix):
            return database_url[len(prefix) :]
    return None


def _ensure_sqlite_directory(database_url: str) -> None:
    sqlite_path = _extract_sqlite_path(database_url)
    if not sqlite_path or sqlite_path == ":memory:" or sqlite_path.startswith("file:"):
        return

    file_path = Path(sqlite_path).expanduser()
    if not file_path.is_absolute():
        file_path = Path.cwd() / file_path
    file_path.parent.mkdir(parents=True, exist_ok=True)


def make_engine(
    database_url: str,
    *,
    echo: bool,
    pool_pre_ping: bool,
    poolclass: type[Pool] | None = None,
) -> Engine:
    _ensure_sqlite_directory(database_url)
    engine_kwargs = {
        "echo": echo,
        "pool_pre_ping": pool_pre_ping,
        "connect_args": _sqlite_connect_args(database_url),
    }
    if poolclass is not None:
        engine_kwargs["poolclass"] = poolclass
    return create_engine(database_url, **engine_kwargs)


# 2. WAL 모드 활성화 (동시성 확보의 핵심)
@event.listens_for(Engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    # 연결된 DB가 SQLite일 때만 PRAGMA 설정 실행
    if dbapi_connection.__class__.__module__.startswith("sqlite3"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()


def make_session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(
        bind=engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
        class_=Session,
    )


settings = get_settings()
engine = make_engine(
    settings.database_url,
    echo=settings.sqlalchemy_echo,
    pool_pre_ping=settings.sqlalchemy_pool_pre_ping,
)
SessionLocal = make_session_factory(engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def session_scope() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db() -> None:
    from app.db.base import Base
    from app.db import models  # noqa: F401

    Base.metadata.create_all(bind=engine)