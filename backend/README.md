# Backend 실행 가이드

## 1. 개요
- 기술 스택: FastAPI + SQLAlchemy + SQLite
- 기본 인증 가정: MVP에서는 미들웨어가 `user_id=1`을 주입
- 상세 설계 문서: `../docs/backend-api-design.md`
- 요약 계약 문서: `../docs/api-contract.md`

## 2. 환경 변수
`backend/.env.example` 값을 참고한다.

필수/권장 키:
- `NOTESYNC_DATABASE_URL`
- `SQLALCHEMY_ECHO`
- `SQLALCHEMY_POOL_PRE_PING`
- `NOTESYNC_UPLOAD_ROOT`
- `NOTESYNC_MEDIA_MAX_BYTES`
- `NOTESYNC_PDF_MAX_BYTES`
- `NOTESYNC_AI_PIPELINE_MODE` (`mock` 또는 `real`)
- `NOTESYNC_WHISPER_MODEL_NAME`
- `NOTESYNC_WHISPER_DEVICE`
- `NOTESYNC_GEMINI_API_KEY`
- `NOTESYNC_GEMINI_MODEL_NAME`
- `NOTESYNC_PDF_KEYWORD_COUNT`
- `NOTESYNC_PROCESSING_TIMEOUT_SEC`

## 3. 설치
백엔드 루트에서 실행:

```bash
python -m pip install -r requirements.txt
```

`real` 모드는 `faster-whisper`, `google-generativeai`, `pypdf`를 사용한다.
`mock` 모드는 외부 API 키 없이 로컬 테스트 용도로 동작한다.

## 3.1 백엔드 서버 실행
백엔드 루트에서 실행:
```bash
python -m venv .venv

# Git Bash
source .venv/Scripts/activate

# PowerShell
# .\.venv\Scripts\Activate.ps1
```

기본 실행:
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

개발용 리로드 실행:
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

## 3.2 업로드 파이프라인 모드
- `mock`
	- PDF/키워드/STT/후보정을 모의 구현으로 수행한다.
	- 기본값이며 테스트 환경에서 사용한다.
- `real`
	- PDF 텍스트 추출: pypdf
	- 키워드/후보정: Gemini API
	- STT: faster-whisper
	- 타임스탬프 불변식 위반 시 보드를 `failed`로 종료한다.

PDF 파일이 없는 업로드는 허용되며 `extract_pdf`, `keywords` 단계를 스킵한다.

## 4. 테스트 실행
기본 테스트:

```bash
PYTHONPATH=. python -m unittest discover -s tests -v
```

SQLite 커넥션 누수 경고를 에러로 승격한 테스트:

```bash
PYTHONWARNINGS=error::ResourceWarning PYTHONTRACEMALLOC=1 PYTHONPATH=. python -m unittest discover -s tests -v
```

## 5. 현재 구현된 API
- `POST /folders`
- `GET /folders`
- `PATCH /folders/{folder_id}`
- `DELETE /folders/{folder_id}`
- `POST /boards/upload`
- `GET /boards`
- `GET /boards/{board_id}`
- `GET /boards/{board_id}/status`
- `PATCH /boards/{board_id}`
- `PUT /boards/{board_id}/segments`
- `DELETE /boards/{board_id}`
- `POST /boards/{board_id}/retry`
- `GET /files/{asset_id}`

## 6. 디렉터리 요약
- `app/core`: 설정/공통 예외
- `app/db`: 모델/세션
- `app/schemas`: Pydantic DTO
- `app/services`: 도메인 서비스
- `app/api/routes`: 라우터
- `tests`: 단위/통합 테스트

## 7. 로컬 스모크 테스트 가이드
아래 순서로 준비하면 업로드부터 상태 폴링, 상세 조회까지 한 번에 검증할 수 있다.

1. 샘플 파일 준비
- 미디어 파일 1개 필수: `backend/samples/lecture.mp4` (또는 mp3/wav)
- PDF 파일 1개 선택: `backend/samples/lecture.pdf`

2. 의존성 설치
```bash
python -m pip install -r requirements.txt
python -m pip install uvicorn
```

3. 환경변수 준비
- mock 모드(권장 시작점)
	- `NOTESYNC_AI_PIPELINE_MODE=mock`
- real 모드
	- `NOTESYNC_AI_PIPELINE_MODE=real`
	- `NOTESYNC_GEMINI_API_KEY` 필수
	- `NOTESYNC_WHISPER_MODEL_NAME`, `NOTESYNC_WHISPER_DEVICE` 권장 설정

4. 스모크 시나리오 실행
```bash
cd backend
bash scripts/smoke_e2e.sh
```

real 모드 예시:
```bash
cd backend
NOTESYNC_AI_PIPELINE_MODE=real \
NOTESYNC_GEMINI_API_KEY=YOUR_KEY \
bash scripts/smoke_e2e.sh
```

실행 스크립트:
- [backend/scripts/smoke_e2e.sh](backend/scripts/smoke_e2e.sh)
- [backend/scripts/smoke_e2e.py](backend/scripts/smoke_e2e.py)

이 스크립트는 다음을 자동 수행한다.
- 로컬 FastAPI 서버 실행(기본)
- `POST /boards/upload` 호출
- `GET /boards/{id}/status` 폴링
- `GET /boards/{id}` 결과 요약 출력
- 실패 시 로그/응답 출력 후 non-zero 종료
- Windows/Git Bash에서 UTF-8 인코딩으로 한글 로그가 깨지지 않도록 출력 인코딩을 강제한다.

## 4. 마이그레이션/테스트/파이프라인 가이드

- Alembic 마이그레이션 적용: `bash scripts/migrate.sh upgrade`
- Alembic 롤백: `bash scripts/migrate.sh downgrade`
- 전체 테스트: `python -m pytest`
- 파이프라인 resume mock 테스트: `python -m pytest tests/test_pipeline_resume.py`
- 파이프라인 상태전이/실패/재시도 플로우: [docs/pipeline-flow.md](../docs/pipeline-flow.md)

---
