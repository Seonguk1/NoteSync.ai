# NoteSync.ai-vol3 Copilot Instructions

이 문서는 이 저장소에서 코드를 작성할 때 항상 지켜야 할 유지보수 중심 규칙이다.

## 0) 기본 원칙
- 변경은 항상 `작게`, `명확하게`, `되돌리기 쉽게` 만든다.
- 동작 변경과 리팩토링을 한 PR/커밋에 섞지 않는다.
- 코드만 보고 의도를 이해할 수 있어야 하며, 필요한 경우에만 짧은 주석을 추가한다.
- 사용자 정책(이 저장소): `media 1개 필수 + pdf 0~1`, PDF 전용, processing 행은 삭제만 허용.

## 1) 아키텍처/구조 규칙

### Frontend (React + TypeScript)
- 컴포넌트는 단일 책임을 가진다. 파일이 커지면 `container`/`presentational`로 분리한다.
- 상태는 최소로 유지한다. 파생 가능한 값은 `state`로 저장하지 않고 계산한다.
- 이벤트로 상태를 올리고(`inverse data flow`), 데이터는 상위 -> 하위로만 흐르게 유지한다.
- 공통 UI 패턴(모달, 버튼, 필드)은 중복 구현하지 말고 공통 컴포넌트로 통합한다.
- 인라인 스타일, `window.prompt/alert` 사용 금지. CSS 클래스 + 공통 컴포넌트 사용.

### Backend (FastAPI)
- 라우터/스키마/DB/서비스 관심사를 분리한다.
- 라우터 함수는 얇게 유지하고, 복잡한 로직은 서비스/유틸로 이동한다.
- 예외 응답 구조를 일관되게 유지한다(`code`, `message`, `details`).
- 데이터 저장 로직은 트랜잭션 경계를 명확히 하고 실패 시 롤백한다.

## 2) 타입/인터페이스 규칙
- TypeScript `strict`를 전제로 한다. `any` 사용 금지(불가피하면 이유 주석 필수).
- 함수/훅/컴포넌트의 public 인터페이스는 타입을 먼저 정의하고 구현한다.
- 매직 문자열/숫자는 상수 또는 타입으로 승격한다.
- Python은 타입 힌트를 우선 사용하고, 함수 시그니처에서 의도를 드러낸다.

## 3) 품질 규칙 (테스트/검증)
- 기능 추가/버그 수정 시 최소 1개 이상의 검증(단위 또는 통합)을 함께 추가한다.
- 리팩토링 후 반드시 빌드/테스트를 실행하고, 실패 상태로 종료하지 않는다.
- 변경이 API 계약에 영향을 주면 `docs/api-contract.md`를 같이 갱신한다.

## 4) 설정/보안 규칙
- 환경별 값(DB URL, 파일 경로, 외부 키)은 코드 하드코딩 금지. 환경변수로 분리한다.
- 비밀정보(토큰, 키, 자격증명)를 코드/문서/로그에 남기지 않는다.
- 파일 업로드는 타입/크기/개수 검증을 서버에서 강제한다.

## 5) 문서/네이밍 규칙
- 코드 식별자는 영어를 사용한다.
- 주석/문서/사용자 노출 문구는 한국어를 사용한다.
- 파일/폴더/함수 이름은 역할이 드러나야 하며 축약어 남용을 피한다.
- PR 설명에는 `무엇을`, `왜`, `어떻게 검증했는지`를 반드시 포함한다.

## 6) 금지 규칙
- 무근거 대규모 리네이밍/파일 이동 금지.
- 사용하지 않는 추상화(미래 대비용 클래스/훅/유틸) 선제 도입 금지.
- 테스트/빌드 실패를 무시한 채 머지 금지.
- 정책 충돌 시 시안보다 `docs/prd-classroom.md`, `docs/domain-model.md`, `docs/api-contract.md`를 우선한다.

## 7) 작업 체크리스트
- 변경 범위가 작고 응집도 높은가?
- 중복 로직을 제거했는가?
- 타입/예외/에러 메시지 일관성을 지켰는가?
- 문서/테스트/빌드 검증까지 완료했는가?

## 8) 공식 문서 근거
- React: Thinking in React
  - https://react.dev/learn/thinking-in-react
- FastAPI: Bigger Applications / APIRouter
  - https://fastapi.tiangolo.com/tutorial/bigger-applications/
- TypeScript Handbook: Everyday Types (`any` 최소화, strict 타입 안전성)
  - https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
- Python PEP 8: Readability counts, naming/import/style conventions
  - https://peps.python.org/pep-0008/
- The Twelve-Factor App: Config는 environment로 분리
  - https://12factor.net/config
- Python unittest: 테스트 구조/검증 패턴
  - https://docs.python.org/3/library/unittest.html
