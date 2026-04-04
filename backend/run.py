import sys
import os
import io
import multiprocessing
import traceback
from dotenv import load_dotenv

# --- 1. PyInstaller 환경에서 정확한 .env 파일 위치 찾기 ---
if getattr(sys, 'frozen', False):
    # .exe 파일로 실행될 때 (.exe 파일과 같은 폴더인 src-tauri/binaries/ 를 바라봄)
    application_path = os.path.dirname(sys.executable)
else:
    # 파이썬 스크립트로 실행될 때 (backend/ 폴더를 바라봄)
    application_path = os.path.dirname(os.path.abspath(__file__))

env_path = os.path.join(application_path, '.env')
load_dotenv(dotenv_path=env_path) # 👈 여기서 명시적으로 키를 불러옵니다!

# --- 2. noconsole 충돌 방지 및 로그 기록 ---
log_file = open("backend_log.txt", "w", encoding="utf-8")
sys.stdout = log_file
sys.stderr = log_file

try:
    import uvicorn
    from app.main import app
except Exception as e:
    # 모듈 임포트 단계에서 뻗으면 여기에 기록됨
    traceback.print_exc()
    sys.exit(1)

if __name__ == "__main__":
    multiprocessing.freeze_support()
    try:
        # FastAPI 서버 실행
        print("🚀 Uvicorn 서버 시작 시도 중...")
        sys.stdout.flush() # 파일에 즉시 쓰기
        
        uvicorn.run(app, host="127.0.0.1", port=8000)
    except Exception as e:
        # 서버 실행 중 뻗으면 여기에 기록됨
        traceback.print_exc()
        sys.stdout.flush()