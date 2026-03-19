from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path

import httpx


def _force_utf8_console() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    os.environ.setdefault("PYTHONUTF8", "1")
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")


def _env(name: str, default: str) -> str:
    return os.getenv(name, default)


def _bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _ensure_file(path: Path, label: str) -> None:
    if not path.exists():
        print(f"[ERROR] {label} 파일이 없습니다: {path}")
        raise SystemExit(1)


def _wait_for_server(base_url: str, timeout_sec: float = 20.0) -> None:
    start = time.time()
    while time.time() - start < timeout_sec:
        try:
            response = httpx.get(f"{base_url}/docs", timeout=2.0)
            if response.status_code == 200:
                return
        except Exception:
            pass
        time.sleep(0.5)
    print("[ERROR] 서버 준비 타임아웃")
    raise SystemExit(1)


def main() -> int:
    _force_utf8_console()

    root_dir = Path(__file__).resolve().parents[1]
    os.chdir(root_dir)

    api_base_url = _env("API_BASE_URL", "http://127.0.0.1:8000")
    poll_seconds = int(_env("POLL_SECONDS", "3"))
    max_polls = int(_env("MAX_POLLS", "120"))
    start_server = _bool_env("START_SERVER", True)

    smoke_folder_name = _env("SMOKE_FOLDER_NAME", "스모크테스트")
    smoke_board_title = _env("SMOKE_BOARD_TITLE", "파이프라인 점검")

    media_path = Path(_env("SAMPLE_MEDIA_PATH", str(root_dir / "samples" / "lecture.m4a")))
    pdf_path = Path(_env("SAMPLE_PDF_PATH", str(root_dir / "samples" / "lecture.pdf")))

    os.environ.setdefault("NOTESYNC_DATABASE_URL", f"sqlite+pysqlite:///{(root_dir / '.data' / 'notesync.db').as_posix()}")
    os.environ.setdefault("NOTESYNC_UPLOAD_ROOT", str(root_dir / ".uploads"))
    os.environ.setdefault("NOTESYNC_MEDIA_MAX_BYTES", "2147483648")
    os.environ.setdefault("NOTESYNC_PDF_MAX_BYTES", "104857600")
    os.environ.setdefault("NOTESYNC_AI_PIPELINE_MODE", "mock")
    os.environ.setdefault("NOTESYNC_WHISPER_MODEL_NAME", "base")
    os.environ.setdefault("NOTESYNC_WHISPER_DEVICE", "cpu")
    os.environ.setdefault("NOTESYNC_GEMINI_MODEL_NAME", "gemini-2.5-flash")
    os.environ.setdefault("NOTESYNC_PDF_KEYWORD_COUNT", "50")
    os.environ.setdefault("NOTESYNC_PROCESSING_TIMEOUT_SEC", "3600")

    (root_dir / ".data").mkdir(exist_ok=True)
    (root_dir / ".uploads").mkdir(exist_ok=True)

    _ensure_file(media_path, "SAMPLE_MEDIA_PATH")

    if os.environ["NOTESYNC_AI_PIPELINE_MODE"] == "real":
        if not os.getenv("NOTESYNC_GEMINI_API_KEY"):
            print("[ERROR] real 모드에서는 NOTESYNC_GEMINI_API_KEY가 필요합니다.")
            return 1
        if not pdf_path.exists():
            print("[WARN] real 모드지만 PDF 파일이 없습니다. PDF 단계는 스킵됩니다.")

    server_process: subprocess.Popen[str] | None = None
    try:
        if start_server:
            print("[INFO] FastAPI 서버를 시작합니다...")
            log_file = (root_dir / ".smoke_server.log").open("w", encoding="utf-8")
            server_process = subprocess.Popen(
                [sys.executable, "-X", "utf8", "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
                stdout=log_file,
                stderr=subprocess.STDOUT,
                env=os.environ.copy(),
                cwd=str(root_dir),
                text=True,
            )
            _wait_for_server(api_base_url)
            print("[INFO] 서버 준비 완료")
        else:
            print("[INFO] START_SERVER=0 이므로 기존 서버를 사용합니다.")

        print("[INFO] 업로드 요청을 전송합니다...")
        print(f"[INFO] media 파일: {media_path}")
        if pdf_path.exists():
            print(f"[INFO] pdf 파일: {pdf_path}")

        files: dict[str, tuple[str, bytes, str]] = {
            "media_file": (media_path.name, media_path.read_bytes(), "audio/mp4")
        }
        if pdf_path.exists():
            files["pdf_file"] = (pdf_path.name, pdf_path.read_bytes(), "application/pdf")

        data = {
            "folder_name": smoke_folder_name,
            "board_title": smoke_board_title,
        }

        upload_response = httpx.post(f"{api_base_url}/boards/upload", data=data, files=files, timeout=120)
        payload = upload_response.json()
        board_id = payload.get("board_id")
        if not board_id:
            print("[ERROR] board_id 파싱 실패")
            print(upload_response.text)
            return 1

        print(f"[INFO] board_id={board_id}")
        print("[INFO] 상태 폴링을 시작합니다...")

        final_status = ""
        for idx in range(1, max_polls + 1):
            status_response = httpx.get(f"{api_base_url}/boards/{board_id}/status", timeout=30)
            status_payload = status_response.json()
            status = status_payload.get("status", "")
            stage = status_payload.get("stage", "")
            progress = status_payload.get("progress_percent", "")
            message = status_payload.get("message", "")

            print(f"[POLL {idx}] status={status} stage={stage} progress={progress} message={message}")
            if status in {"completed", "failed"}:
                final_status = status
                break
            time.sleep(poll_seconds)

        if not final_status:
            print(f"[ERROR] 폴링 타임아웃: MAX_POLLS={max_polls}")
            return 1

        print("[INFO] 상세 조회를 수행합니다...")
        detail_response = httpx.get(f"{api_base_url}/boards/{board_id}", timeout=30)
        detail_payload = detail_response.json()

        print("[INFO] 상세 요약")
        print(f"board_id: {detail_payload.get('id')}")
        print(f"status: {detail_payload.get('status')}")
        print(f"title: {detail_payload.get('title')}")
        media = detail_payload.get("media") or {}
        print(f"media_duration_sec: {media.get('duration_sec')}")
        segments = detail_payload.get("segments") or []
        print(f"segments_count: {len(segments)}")
        if segments:
            print(f"first_segment: {segments[0].get('text')}")

        if final_status == "failed":
            print("[ERROR] 파이프라인 처리 실패")
            print(json.dumps(detail_payload, ensure_ascii=False))
            return 1

        print(f"[OK] 스모크 테스트 성공: board_id={board_id} status={final_status}")
        return 0
    finally:
        if server_process is not None:
            server_process.terminate()
            try:
                server_process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                server_process.kill()


if __name__ == "__main__":
    raise SystemExit(main())
