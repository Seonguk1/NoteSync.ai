import os
from sqlmodel import SQLModel, create_engine, Session
from app.models import Term, Course, Session as SessionModel, Material, Transcript

# 로컬 DB 파일이 저장될 경로 설정 (프로젝트 루트의 data 폴더)
# 경로가 없으면 자동으로 생성하도록 처리할 수도 있습니다.
DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
os.makedirs(DB_DIR, exist_ok=True)

sqlite_file_name = os.path.join(DB_DIR, "scholar.db")
sqlite_url = f"sqlite:///{sqlite_file_name}"

# echo=True를 설정하면 터미널에 실제 실행되는 SQL 쿼리가 출력되어 디버깅에 매우 좋습니다.
engine = create_engine(sqlite_url, echo=True, connect_args={"check_same_thread": False})

def create_db_and_tables():
    """앱이 켜질 때 모델을 바탕으로 테이블을 생성합니다."""
    SQLModel.metadata.create_all(engine)

def get_session():
    """FastAPI API 엔드포인트에서 DB 세션을 주입받을 때 사용하는 함수입니다."""
    with Session(engine) as session:
        yield session