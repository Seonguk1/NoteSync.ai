import os
import subprocess
import sys
import shutil
from typing import Optional

# 공식 FFmpeg 다운로드 페이지
FFMPEG_DOWNLOAD_URL = "https://ffmpeg.org/download.html"

def ensure_audio(file_path: str) -> str:
    """
    영상 또는 오디오 파일을 받아, Whisper 처리에 최적화된 
    압축 오디오(16kHz, Mono, mp3) 파일로 변환한 뒤 해당 경로를 반환합니다.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"미디어 파일을 찾을 수 없습니다: {file_path}")

    # 원본 파일명에서 확장자를 .mp3로 변경 (예: lecture.mp4 -> lecture_audio.mp3)
    base_dir = os.path.dirname(file_path)
    file_name = os.path.basename(file_path)
    name_without_ext = os.path.splitext(file_name)[0]
    
    output_filename = f"{name_without_ext}_audio.mp3"
    output_path = os.path.join(base_dir, output_filename)

    # 이미 변환된 파일이 있다면 시간 절약을 위해 바로 반환
    if os.path.exists(output_path):
        print(f"⏩ 이미 변환된 오디오가 존재합니다: {output_path}")
        return output_path

    print(f"🎵 오디오 추출 및 압축 시작: {file_path} -> {output_path}")
    
    # 번들/환경/시스템 경로에서 ffmpeg를 찾는 헬퍼
    def _locate_ffmpeg() -> Optional[str]:
        env = os.environ.get("FFMPEG_PATH")
        if env and os.path.exists(env):
            return env

        meipass = getattr(sys, "_MEIPASS", None)
        exe_name = "ffmpeg.exe" if os.name == "nt" else "ffmpeg"

        if meipass:
            candidate = os.path.join(meipass, exe_name)
            if os.path.exists(candidate):
                return candidate

        # 번들(exe)로 실행 중이면 실행 파일과 같은 폴더 확인
        if getattr(sys, "frozen", False):
            exe_dir = os.path.dirname(sys.executable)
        else:
            exe_dir = os.path.dirname(os.path.abspath(__file__))

        candidate = os.path.join(exe_dir, exe_name)
        if os.path.exists(candidate):
            return candidate

        # 시스템 PATH
        path = shutil.which("ffmpeg")
        if path:
            return path

        return None

    ffmpeg_path = _locate_ffmpeg()
    if not ffmpeg_path:
        raise RuntimeError(
            "FFmpeg 실행 파일을 찾을 수 없습니다. 오디오 변환 기능을 사용하려면 ffmpeg를 설치해주세요.\n"
            f"다운로드: {FFMPEG_DOWNLOAD_URL}\n"
            "Windows 사용자는 `backend/ffmpeg/`에 `ffmpeg.exe`를 넣거나 시스템 PATH에 추가하거나 "
            "환경변수 `FFMPEG_PATH`를 설정할 수 있습니다. 설치 후 앱을 재시작하세요."
        )

    # FFmpeg 명령어 구성 (Whisper 최적화 세팅)
    # -ar 16000 : 샘플링 레이트 16kHz (Whisper 기본 스펙)
    # -ac 1     : 모노 채널 (용량 절반으로 감소)
    # -c:a libmp3lame -q:a 2 : 고품질 mp3 압축
    command = [
        ffmpeg_path,
        "-y",                 # 덮어쓰기 허용
        "-i", file_path,      # 입력 파일
        "-ar", "16000",       # 16kHz
        "-ac", "1",           # Mono
        "-c:a", "libmp3lame", # mp3 코덱
        "-q:a", "2",          # VBR 품질 (좋음)
        output_path           # 출력 파일
    ]

    try:
        # 서브프로세스로 FFmpeg 실행 (출력은 무시하고 에러만 잡음)
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        print(f"✅ 오디오 압축 완료: {output_path}")
        print(f"📁 원본 파일 크기: {os.path.getsize(file_path) / (1024*1024):.2f} MB")
        print(f"📁 압축된 파일 크기: {os.path.getsize(output_path) / (1024*1024):.2f} MB")
        return output_path
        
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.decode('utf-8', errors='ignore') if e.stderr else str(e)
        print(f"❌ FFmpeg 변환 실패 ({ffmpeg_path}): {error_msg}")
        raise RuntimeError(
            "오디오 변환 중 오류가 발생했습니다. 포함된 ffmpeg 또는 시스템 ffmpeg를 확인하세요.\n"
            f"FFmpeg 다운로드: {FFMPEG_DOWNLOAD_URL}\n"
            f"FFmpeg 로그: {error_msg}"
        )
    