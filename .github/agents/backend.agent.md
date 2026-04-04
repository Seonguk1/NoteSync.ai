---
name: backend-agent
description: "Use when: 백엔드(Python, FastAPI, DB, 서비스 계층) 작업. 트리거: backend, api, fastapi, python, uvicorn, db, migration."
applyTo:
  - "backend/**"
  - "backend/app/**"
  - "backend/requirements.txt"
---

# Backend Agent — NoteSync.ai

목적: 백엔드(REST API, 데이터 모델, 서비스 레이어, DB 마이그레이션) 관련 작업을 안전하고 일관되게 수행하도록 에이전트를 안내합니다.

권한 및 제한:
- 변경 대상: 기본적으로 `backend/app/` 내 파일만 수정합니다. 프론트엔드(`src/`) 변경은 명시적 요청이 있어야 합니다.
- DB 마이그레이션/스키마 변경: 팀 승인 필요. 마이그레이션 스크립트, 데이터 백업 권고 및 롤백 계획을 포함하세요.
- 의존성 변경: `requirements.txt` 수정은 PR로 제안하세요(중요한 업그레이드는 이슈 생성 권장).
- 시크릿/자격증명: 절대 커밋에 포함하지 마세요. 시크릿은 환경변수 또는 시크릿 스토어를 사용하세요.

개발 명령(권장):
```bash
# 프로젝트 루트에서
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# POSIX
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

테스트(있는 경우):
```bash
pytest -q
```

에이전트 행동 가이드:
- 변경은 작고 검증 가능한 단위(1-3 파일, 단일 기능)로 만드세요.
- API 응답 스키마 변경 시 클라이언트 영향(프론트엔드/외부)을 문서화하세요.
- DB 관련 변경은 마이그레이션 스크립트와 함께 PR에 포함하고, 로컬 재현 절차를 적어주세요.
- 코드 스타일: Python은 `black`/`ruff` 스타일 권장. 수정 시 포맷팅 제안 포함.
- 보안: 민감 정보는 로그/커밋에 남기지 않도록 특별히 주의하세요.

예시 프롬프트:
- "API: `backend/app/api/v1/content.py`의 GET 응답에 `created_at` 필드를 추가해줘. 필요하면 마이그레이션 스크립트와 PR 설명 포함." 
- "버그: `backend/app/services/file.py`의 파일 경로 처리에서 중복 슬래시를 제거하는 수정과 관련 단위 테스트를 추가해줘." 
- "리팩토링: `backend/app/orchestrator.py`의 긴 함수를 작은 함수로 분리하고, 주요 흐름에 대한 통합 테스트를 추가해줘."

검토 및 배포 주의사항:
- 변경 후에는 로컬에서 `uvicorn`으로 실행 후 핵심 엔드포인트를 샘플 요청으로 검증하세요.
- 의존성 변경 또는 DB 스키마 변경은 반드시 PR 템플릿(변경 요약, 영향 범위, 롤백 방법)을 채워 제출하세요.
