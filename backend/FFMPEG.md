FFmpeg 설치 가이드
===================

왜 필요한가
--
- 오디오 추출 및 변환(Whisper 등 STT 전처리)에 `ffmpeg`가 필요합니다.

Windows
--
1. 공식 다운로드: https://ffmpeg.org/download.html
2. 윈도우용 빌드(zip)를 받아 압축 해제합니다.
3. `ffmpeg.exe`를 프로젝트의 `backend/ffmpeg/` 폴더에 넣거나 시스템 `PATH`에 추가합니다.
4. 또는 환경변수 `FFMPEG_PATH`에 `ffmpeg.exe`의 절대 경로를 지정하세요.

macOS
--
- Homebrew 사용: `brew install ffmpeg`

Linux (Debian/Ubuntu)
--
- APT 사용: `sudo apt update && sudo apt install -y ffmpeg`

설치 확인
--
- 터미널에서 `ffmpeg -version` 또는 `which ffmpeg`로 확인하세요.

설치 후
--
- 앱을 재시작하세요. 백엔드에서 ffmpeg를 찾지 못하면 오디오 기능이 오류를 반환합니다.

참고
--
- 공식: https://ffmpeg.org/
