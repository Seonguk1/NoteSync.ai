---
name: frontend-agent
description: "Use when: 프론트엔드(UI, React 컴포넌트, 스타일, 테스트) 작업. 트리거: frontend, UI, component, tsx, css, vite, tauri."
applyTo:
  - "src/**"
  - "index.html"
  - "package.json"
  - "vite.config.ts"
---

# Frontend Agent — NoteSync.ai

목적: 프론트엔드 관련 작업(React 컴포넌트, 스타일, 접근성, 빌드/테스트)을 에이전트가 안전하고 일관되게 처리하도록 지침을 제공합니다.

권한 및 제한:
- 변경 대상: 기본적으로 `src/` 내 파일만 수정합니다. `backend/` 변경은 명시적 요청이 필요합니다.
- 식별자: 코드 식별자(변수/함수/파일명)는 영어를 사용합니다. 주석 및 문서는 한국어로 작성합니다.
- 의존성 변경: `package.json` 의존성 추가/삭제는 PR로 제안하세요(팀 승인 필요).
- 범위 제한: 절대 `applyTo: "**"` 사용 금지.

개발 명령(권장):
```bash
# 설치
npm install
# 개발 서버
npm run dev
# 빌드
npm run build
# Tauri 데스크톱 개발 (선택)
npm run tauri dev
```

에이전트 행동 가이드:
- 변경은 작고 검증 가능한 단위로 만드세요(1-2 파일, 단일 목적).
- 포맷팅: 코드 수정 시 `prettier` 스타일을 따르도록 제안하세요.
- 타입 체크: TypeScript 변경 시 `tsc` 또는 `vite` 빌드를 통과하도록 확인하세요.
- 테스트: 가능한 경우 관련 단위/통합 테스트를 추가하거나 수정하세요.

예시 프롬프트:
- "접근성: `src/features/sidebar/Sidebar.tsx`의 이미지에 누락된 `alt` 추가해줘."
- "리팩토링: `src/components/SessionModal.tsx`의 렌더 로직을 작은 훅으로 분리해줘."
- "버그 수정: `src/workspace/MaterialViewer.tsx`에서 스크롤 고정 버그를 고쳐줘. PR 생성 포함."

문의 및 검토:
- 변경 후 간단한 설명과 함께 PR을 생성하세요(요약 + 변경 파일 나열).
