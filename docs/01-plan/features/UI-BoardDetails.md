# PDCA Plan: UI-BoardDetails

## 1. 개요
- 목표: NoteSync.ai 프론트엔드의 보드 상세 페이지(`BoardDetailsScreen`)에 PDF 뷰어 연동 및 UI 완성.
- 배경: 현재 `MediaStage`에는 영상 및 오디오 재생 기능이 구현되어 있으나, 요구사항(PRD)에 명시된 "오디오인 경우 PDF 뷰어 표시" 기능이 누락되어 있습니다. 백엔드에서 반환되는 PDF 자산(`BoardAssetResponse`)을 프론트엔드 타입에 추가하고 화면에 렌더링해야 합니다.

## 2. 작업 범위 (Scope)
1. **타입 및 API 갱신**
   - `frontend/src/features/study/types.ts`의 `BoardDetail` 타입에 `pdfUrl` 또는 `pdf` 객체 속성 추가.
   - `frontend/src/features/study/api.ts`에서 백엔드의 `BoardDetailResponse`로부터 `pdf` 정보를 파싱하여 매핑.
2. **MediaStage 컴포넌트 수정**
   - 오디오 파일 재생 시 화면 중앙에 "오디오 파일 재생 중" 문구 대신, PDF 파일이 존재할 경우 해당 PDF 뷰어(또는 `<iframe>` / `<object>`) 렌더링.
   - 하단 자막(Subtitle)은 기존처럼 오버레이로 표시.
   - PDF 스크롤은 브라우저 기본 스크롤(또는 iframe 내부 스크롤)에 맡기되, 레이아웃에 맞게 꽉 차도록(CSS) 스타일 조정.
3. **오디오 지원 (Fallback 처리)**
   - 만약 오디오 파일인데 PDF가 없는 경우, 기존처럼 검은 화면에 "오디오 파일 재생 중" 안내.

## 3. 세부 구현 계획
1. `types.ts`: `BoardDetail` 인터페이스에 `pdf?: { url: string; mimeType: string }` 추가.
2. `api.ts`: `fetchBoardDetail` 내 매핑 로직에서 백엔드의 `pdf` 파싱 적용.
3. `MediaStage.tsx`:
   - `pdfUrl` props 추가
   - `isVideo` 외에 `!isVideo && pdfUrl` 조건 처리
   - `<iframe src={pdfUrl} className="h-full w-full" />` 등으로 PDF 표시 구현.
   - 자막 위치가 iframe을 가리지 않도록 z-index 등 조정.

## 4. 예상 일정
- 1 스프린트 내 완료 목표. 프론트엔드 UI/UX 작업 위주.

## 5. 성공 기준 (AC)
- [ ] 오디오 + PDF 조합 보드 상세 페이지 접근 시 오디오 재생 및 PDF 파일이 화면에 출력된다.
- [ ] PDF 스크롤 시 정상적으로 문서 탐색이 가능하다.
- [ ] 하단 자막이 PDF 위로 정상 노출된다.
