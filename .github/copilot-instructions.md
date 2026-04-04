<!--
  Copilot / Agent 지침 — NoteSync.ai
  이 파일은 이 저장소에서 AI 에이전트(Copilot Chat 등)가 효율적으로 작업하도록 돕기 위한 '워크스페이스 수준' 지침입니다.
  - 코드 식별자(identifier): 영어 사용
  - 코드 주석 및 문서: 한국어 사용
-->

# Copilot 지침 — NoteSync.ai

## 목적
- 이 파일은 AI 에이전트가 이 저장소의 구조, 빌드/실행 방법, 주요 관습(Conventions)과 피해야 할 안티패턴을 빠르게 이해하고 안전하게 작업하도록 안내합니다.

## 빠른 시작

- 백엔드 (Python, `backend/`):

```bash
# 권장: 프로젝트 루트에서
cd backend
python -m venv .venv            # 가상환경 생성
# Windows
.venv\Scripts\activate
# POSIX
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

- 프론트엔드 (Vite + React / Tauri):

```bash
# 루트에서
npm install
npm run dev           # vite 개발서버
# 또는 데스크톱 개발용
npm run tauri dev     # 내부적으로 `tauri dev` 실행
```

- 빌드:

```bash
npm run build         # 프론트엔드 빌드 (tsc && vite build)
# Tauri 패키징(데스크톱):
npm run tauri build
```

## 아키텍처 요약
- 프론트엔드: `src/` — React + Vite + Tauri 연동
- 백엔드: `backend/app/` — FastAPI(uvicorn) 기반 REST/API
- 데스크톱 번들: `src-tauri/` (Cargo.toml 포함)

주요 파일:
- `backend/app/main.py` — 백엔드 진입점
- `backend/requirements.txt` — Python 의존성
- `package.json` — 프론트엔드 스크립트 및 tauri 명령

## 규칙(Conventions)
- 코드 식별자: 영어 사용
- 주석·문서: 한국어 사용 (프로젝트 표준)
- 작은 변경은 해당 기능의 범위 안에서만 진행: 기능 외 변경 금지

## 안티패턴
- 저장소 전체에 영향을 주는 포맷/디펜던시 변경을 PR 없이 임의로 적용하지 마십시오.
- `applyTo: "**"`처럼 무차별적 지시문을 항상 포함하지 마십시오(에이전트 성능 및 컨텍스트 오염 우려).

## 에이전트 동작 가이드
- 변경 제안은 항상 관련 파일만 수정하고, 테스트/빌드 단계가 깨지지 않도록 설명을 덧붙이세요.
- 큰 변경(설계 변경, 의존성 교체 등)은 먼저 이슈 생성을 권장합니다.

## 예시 프롬프트 (테스트용)
- "프론트엔드: `src/features/sidebar/Sidebar.tsx`에 있는 파일에서 X 버튼의 접근성 문제를 고쳐줘. 관련 스냅샷 테스트는 영향 받지 않도록 해." 
- "백엔드: `backend/app/api/v1/content.py`에서 API 응답에 `created_at`을 추가하는 소규모 PR 패치를 만들어줘. 유닛 테스트도 함께 추가해줘." 
- "문서화: README에 로컬 개발 시작 단계를 간단히 추가해줘(프론트/백엔드)."

## 다음 권장 커스터마이징
- Workspace Hook: `pre-commit` 또는 `pre-push`에서 `black`/`ruff`(Python)와 `prettier`(JS)를 자동 검사하도록 권장
- Agent: 프론트엔드 전용 `applyTo: src/**` 에이전트(코드 스타일 및 UI 변경 요청에 특화)
- Prompt: `create-release-notes.prompt.md` — 자동 릴리즈 노트 초안 생성용

---
참고: 자세한 규칙이나 대규모 변경 정책은 팀과 협의 후 이 파일을 업데이트하세요。
