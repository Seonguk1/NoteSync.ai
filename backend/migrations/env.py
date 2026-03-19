import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context

# ---------------------------------------------------------------------
# 1. 프로젝트 루트 경로를 sys.path에 추가 (매우 중요!)
# 현재 파일(backend/migrations/env.py) 위치를 기준으로 상위 폴더(backend)를 경로에 넣습니다.
# 그래야 'from app.db...' 처럼 임포트가 가능합니다.
# ---------------------------------------------------------------------
parent_dir = os.path.abspath(os.path.join(os.getcwd()))
sys.path.append(parent_dir)

# ---------------------------------------------------------------------
# 2. 모든 모델 임포트 (Base.metadata를 채우기 위함)
# 이 부분이 빠지면 Alembic이 테이블을 인식하지 못하고 'pass'만 생성합니다.
# ---------------------------------------------------------------------
from app.db.base import Base  # 성욱 님의 Base 경로
# 모든 모델을 한 번씩 호출해줘야 metadata에 등록됩니다.
from app.db.models import (
    User, 
    Folder, 
    Board, 
    BoardAsset, 
    ProcessingJob, 
    TranscriptSegment
)

# ---------------------------------------------------------------------

# Alembic Config 객체
config = context.config

# 로깅 설정
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 3. MetaData 설정 (None 대신 Base.metadata 사용)
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # 만약 alembic.ini에 URL을 적지 않고 코드에서 직접 관리하고 싶다면
    # 아래 코드를 사용하여 URL을 주입할 수 있습니다.
    # configuration = config.get_section(config.config_ini_section)
    # configuration["sqlalchemy.url"] = "sqlite:///./test.db"
    
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            # SQLite를 사용한다면 render_as_batch=True 옵션이 유용합니다.
            render_as_batch=True 
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()