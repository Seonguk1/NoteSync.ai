import os
import shutil
import subprocess
import platform

# 1. 설정 변수
APP_NAME = "api"  # Tauri가 인식할 사이드카 이름
ENTRY_FILE = "run.py"  # FastAPI 진입점 파일
OUTPUT_DIR = "dist"
TARGET_BIN_DIR = os.path.join("..", "src-tauri", "binaries")

def get_target_triple():
    """현재 시스템의 Rust 타겟 트리플을 가져옵니다."""
    try:
        # 'rustc -Vv' 명령어를 실행해 host 정보를 추출합니다.
        output = subprocess.check_output(["rustc", "-Vv"]).decode("utf-8")
        for line in output.splitlines():
            if line.startswith("host:"):
                return line.split(":")[1].strip()
    except Exception as e:
        print(f"타겟 트리플 확인 실패: {e}")
        return None

def build():
    triple = get_target_triple()
    if not triple:
        return

    # 2. binaries 폴더가 없으면 생성
    if not os.path.exists(TARGET_BIN_DIR):
        os.makedirs(TARGET_BIN_DIR)

    print(f"🚀 빌드 시작 (Target: {triple})...")

    # 3. PyInstaller 실행
    # --clean: 캐시 삭제, --onefile: 단일 파일, --noconsole: 터미널 숨김
    pyinstaller_cmd = [
        "pyinstaller",
        "--upx-dir", ".",
        "--clean",
        "--onefile",
        "--noconsole",
        "--paths", ".",
        "--collect-all", "app",
        "--hidden-import", "app.api.v1.debug",
        "--name", APP_NAME,
        ENTRY_FILE
    ]
    subprocess.run(pyinstaller_cmd, check=True)

    # 4. 파일 이름 변경 및 이동
    ext = ".exe" if platform.system() == "Windows" else ""
    source_file = os.path.join(OUTPUT_DIR, f"{APP_NAME}{ext}")
    dest_file = os.path.join(TARGET_BIN_DIR, f"{APP_NAME}-{triple}{ext}")

    print(f"📦 파일 이동 중: {source_file} -> {dest_file}")
    
    # 기존 파일이 있으면 삭제하고 새로 복사
    if os.path.exists(dest_file):
        os.remove(dest_file)
    shutil.move(source_file, dest_file)

    print("✅ 모든 작업이 완료되었습니다!")

if __name__ == "__main__":
    build()