import os
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# 내부 모듈 임포트
from app.database import create_db_and_tables
from app.orchestrator import orchestrator
from app.api.v1.router import api_router

# 1. FastAPI 앱 초기화
app = FastAPI(
    title="Architectural Scholar API",
    description="AI-Powered Learning Assistant Backend",
    version="1.0.0"
)

# 2. CORS 설정 (Tauri 프론트엔드와 통신 허용)
# CORS 설정: 환경변수 `ALLOWED_ORIGINS`(쉼표구분)로 오리진을 지정할 수 있습니다.
# 기본값은 개발 환경에서 자주 사용하는 로컬 origin들입니다.
allowed_origins_env = os.environ.get("ALLOWED_ORIGINS")
if allowed_origins_env:
    allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
# ... 앞부분 생략 ...

else:
    allowed_origins = [
        "http://localhost:1420",
        "http://127.0.0.1:1420",
        "tauri://localhost",       # macOS/Linux용
        "http://tauri.localhost",  # 👈 Windows Tauri v2 필수 추가!
        "http://localhost",
        "file://"
    ]

# Tauri origin을 항상 허용하도록 추가하는 부분도 안전하게 둘 다 넣습니다.
if "tauri://localhost" not in allowed_origins:
    allowed_origins.append("tauri://localhost")
if "http://tauri.localhost" not in allowed_origins:
    allowed_origins.append("http://tauri.localhost")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],  # 👈 ["GET", "POST"...] 대신 모든 메서드 허용으로 변경 (개발 시 유리)
    allow_headers=["*"],  # 👈 특이한 헤더가 차단되지 않도록 모든 헤더 허용으로 변경
)
# 3. 미디어 파일 서빙 설정 (React에서 영상 재생을 위해 필수)
UPLOAD_ROOT = "data"
os.makedirs(os.path.join(UPLOAD_ROOT, "uploads"), exist_ok=True)
app.mount("/media", StaticFiles(directory=UPLOAD_ROOT), name="media")

# 4. 서버 시작 시 이벤트 (DB 초기화 및 워커 실행)
@app.on_event("startup")
async def on_startup():
    create_db_and_tables()
    asyncio.create_task(orchestrator.worker())
    print("✅ Database tables created & Background Worker started!")

# 5. 분리된 API 라우터 일괄 등록 (모든 API는 /api/v1 으로 시작함)
app.include_router(api_router, prefix="/api/v1")