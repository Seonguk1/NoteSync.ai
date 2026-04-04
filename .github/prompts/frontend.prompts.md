# Frontend Agent Prompts — NoteSync.ai

이 파일은 `frontend-agent`가 사용할 수 있는 예시 프롬프트 모음입니다. 각 프롬프트는 복사해서 붙여넣기해 사용하세요.

---

## Quick Tips
- Trigger keywords: `frontend`, `UI`, `component`, `tsx`, `css`, `vite`, `tauri`.
- 범위: 기본적으로 `src/` 내 변경만 수행합니다. `package.json` 등 의존성 변경은 PR로 제안하세요.

---

## Prompt Templates

1) 접근성: 이미지/아이콘 alt 추가

```
프론트엔드: 다음 파일에서 접근성 누락을 고쳐줘: {file_path}
- img/svg 태그에 누락된 `alt` 또는 `aria-label`을 추가하고, 짧은 한국어 설명(1-2문장)을 작성해주세요.
- 변경 이유와 로컬에서 확인하는 단계(브라우저에서 어느 경로로 확인할지)를 PR 설명에 포함하세요.
```

예시:
```
프론트엔드: src/features/sidebar/Sidebar.tsx에서 이미지에 누락된 alt를 추가해줘. 변경한 파일과 확인 방법을 PR에 적어줘.
```

2) 컴포넌트 리팩토링

```
프론트엔드: {file_path}의 렌더/상태 로직을 분리해 `use{Component}Logic` 훅으로 추출하고, 간단한 단위 테스트를 추가해줘.
- 제안 훅 이름과 타입 선언을 포함하고, 변경 목록과 PR 요약을 작성해줘.
```

3) 스타일/레이아웃 버그 수정

```
프론트엔드: {file_path}에서 레이아웃 깨짐을 수정해줘. Tailwind 클래스(또는 CSS)만 수정하고, 변경 전/후 증빙(스크린샷 또는 설명)을 PR에 포함해주세요.
```

4) 버그 재현용 테스트 + 수정

```
프론트엔드: {file_path}에서 보고된 버그({bug_description})를 재현하는 최소 테스트를 작성하고, 그 원인을 고쳐줘. 테스트 실행 명령과 통과 여부를 PR에 적어줘.
```

5) 단위/통합 테스트 추가

```
프론트엔드: {file_path}의 핵심 동작(버튼 클릭, 폼 제출 등)에 대한 단위 테스트를 추가해줘. 사용 프레임워크는 `vitest`/`@testing-library/react` 권장. 테스트 실행 명령과 예시를 포함해주세요.
```

---

## Assistant 제약 사항
- 변경은 작게(1-3 파일) 유지하세요.
- 의존성 추가/삭제는 PR 제안으로만 수행하세요.
- TypeScript 오류가 발생하지 않도록 `npm run build`(또는 `tsc`)로 빌드/타입체크 통과 여부를 확인하세요.

---

## Prompt 변수
- `{file_path}`: 예: `src/features/sidebar/Sidebar.tsx`
- `{bug_description}`: 사용자 제공 문제 설명
