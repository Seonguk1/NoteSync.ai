# NoteSync.ai

## 프로젝트 개요
NoteSync.ai는 비디오/오디오 및 PDF 업로드를 처리하도록 설계된 스마트 강의 노트 애플리케이션 MVP입니다. AI(Whisper를 통한 Speech-to-Text)를 사용하여 미디어 파일에서 스크립트를 추출하고, PyMuPDF를 사용하여 PDF에서 텍스트를 추출하며, Google Gemini API를 사용하여 키워드 추출 및 후처리를 수행합니다. 

이 애플리케이션은 폴더/보드 구조의 "내 강의실(My Classroom)" 인터페이스, 업로드 팝업, 분할된 미디어 플레이어 및 대화형 스크립트를 나란히 제공하는 상세 보드 뷰 기능을 특징으로 합니다.

## 아키텍처 및 기술 스택
이 프로젝트는 Python 백엔드와 React 프론트엔드로 구성된 풀스택 프로젝트입니다.

**백엔드 (`/backend`)**
- **프레임워크:** FastAPI
- **데이터베이스:** SQLite (SQLAlchemy ORM 사용)
- **AI/ML 연동:**
  - `faster-whisper`: Speech-to-Text (STT) 처리
  - `google-generativeai`: 키워드 추출 및 텍스트 후처리
  - `pypdf`: PDF 텍스트 추출
- **파이프라인 모드:** `NOTESYNC_AI_PIPELINE_MODE`를 통해 `mock`(외부 API 없이 로컬 테스트용) 및 `real` 모드를 지원합니다.

**프론트엔드 (`/frontend`)**
- **프레임워크:** React 19 (TypeScript)
- **빌드 도구:** Vite
- **스타일링:** Tailwind CSS v4
- **상태 관리:** Zustand
- **라우팅:** React Router DOM

## 빌드 및 실행 가이드

### 백엔드 설정
1. `backend` 디렉터리로 이동합니다.
2. 의존성을 설치합니다:
   ```bash
   python -m pip install -r requirements.txt
   ```
3. `.env.example`을 참고하여 환경 변수를 설정합니다. (`NOTESYNC_AI_PIPELINE_MODE` 및 `real` 모드 사용 시 Gemini/Whisper API 키 필수)
4. 개발 서버를 실행합니다:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
5. 테스트를 실행합니다:
   ```bash
   PYTHONPATH=. python -m unittest discover -s tests -v
   ```
6. **스모크 테스트:** E2E 스모크 테스트 스크립트를 실행하여 업로드 파이프라인을 검증합니다.
   ```bash
   bash scripts/smoke_e2e.sh
   ```

### 프론트엔드 설정
1. `frontend` 디렉터리로 이동합니다.
2. 의존성을 설치합니다:
   ```bash
   npm install
   ```
3. 개발 서버를 실행합니다:
   ```bash
   npm run dev
   ```
4. 프로덕션 빌드:
   ```bash
   npm run build
   ```

## 프로젝트 구조
- `backend/`: FastAPI 서버, 데이터베이스 모델, 서비스, AI 파이프라인 통합 및 테스트.
  - `app/`: 핵심 애플리케이션 코드 (API 라우트, 핵심 설정, DB, 스키마, 서비스).
  - `tests/`: 단위 및 통합 테스트.
  - `scripts/`: E2E 스모크 테스트 스크립트.
- `frontend/`: React SPA.
  - `src/`: React 컴포넌트, 기능(features), 훅, 상태 및 스타일.
  - `screens/`: 메인 화면 뷰 (예: `boardDetailsScreen`, `myLectureRoomScreen`, `uploadPopup`).
- `docs/`: 제품 요구사항 문서(PRD), API 계약서, 도메인 모델 및 기술적 컨텍스트.

## ⚠️ 개발 및 유지보수 규칙 (Copilot Instructions 기반)

이 저장소에서 코드를 작성할 때 다음 규칙을 항상 준수해야 합니다:

### 0) 기본 원칙
- **작고 명확하게:** 변경은 항상 작게, 명확하게, 되돌리기 쉽게 만듭니다.
- **분리 원칙:** 동작 변경과 리팩토링을 한 PR/커밋에 섞지 않습니다.
- **가독성:** 코드만 보고 의도를 이해할 수 있어야 하며, 필요한 경우에만 짧은 주석을 추가합니다.
- **사용자 정책:** `media 1개 필수 + pdf 0~1`, PDF 전용, `processing` 행은 삭제만 허용.

### 1) 아키텍처/구조 규칙
- **Frontend:**
  - 컴포넌트는 단일 책임을 가집니다. 파일이 커지면 `container`/`presentational`로 분리합니다.
  - 상태는 최소로 유지하고 파생 가능한 값은 계산해서 사용합니다 (`inverse data flow` 적용).
  - 공통 UI 패턴은 중복 구현하지 말고 공통 컴포넌트로 통합합니다.
  - 인라인 스타일 및 `window.prompt/alert` 사용을 금지합니다 (CSS 클래스 + 공통 컴포넌트 사용).
- **Backend:**
  - 라우터/스키마/DB/서비스 관심사를 엄격히 분리합니다.
  - 라우터 함수는 얇게 유지하고 복잡한 로직은 서비스/유틸로 이동합니다.
  - 일관된 예외 응답 구조(`code`, `message`, `details`)를 유지합니다.
  - 데이터 저장 로직은 트랜잭션 경계를 명확히 하고 실패 시 롤백합니다.

### 2) 타입/인터페이스 규칙
- TypeScript는 `strict` 모드를 전제로 하며 `any` 사용을 금지합니다 (불가피할 경우 이유 주석 필수).
- 함수/훅/컴포넌트의 public 인터페이스는 타입을 먼저 정의하고 구현합니다.
- 매직 문자열/숫자는 상수 또는 타입으로 승격합니다.
- Python은 타입 힌트를 우선 사용하고 함수 시그니처에서 의도를 명확히 드러냅니다.

### 3) 품질 규칙 (테스트/검증)
- 기능 추가/버그 수정 시 최소 1개 이상의 검증(단위 또는 통합 테스트)을 함께 추가합니다.
- 리팩토링 후 반드시 빌드/테스트를 실행하고 실패 상태로 종료하지 않도록 합니다.
- 변경이 API 계약에 영향을 주면 반드시 `docs/api-contract.md`를 함께 갱신합니다.

### 4) 설정/보안 규칙
- 환경별 값(DB URL, 파일 경로, 외부 키)은 하드코딩을 금지하고 환경변수로 분리합니다.
- 비밀정보(토큰, 키, 자격증명 등)를 코드/문서/로그에 절대 남기지 않습니다.
- 파일 업로드 검증(타입/크기/개수)은 반드시 서버 측에서 강제합니다.

### 5) 문서/네이밍 규칙
- 코드 식별자는 **영어**를 사용합니다.
- 주석/문서/사용자 노출 문구는 **한국어**를 사용합니다.
- 파일/폴더/함수 이름은 역할이 드러나야 하며 축약어 남용을 피합니다.
- PR 설명에는 `무엇을`, `왜`, `어떻게 검증했는지`를 반드시 포함해야 합니다.

### 6) 금지 규칙 (Strict Rules)
- 무근거한 대규모 리네이밍 및 파일 이동 금지.
- 사용하지 않는 추상화(미래 대비용 클래스/훅/유틸) 선제 도입 금지.
- 테스트/빌드 실패를 무시한 채 머지 금지.
- 정책 충돌 시 디자인 시안보다 `docs/prd-classroom.md`, `docs/domain-model.md`, `docs/api-contract.md` 문서를 우선합니다.
