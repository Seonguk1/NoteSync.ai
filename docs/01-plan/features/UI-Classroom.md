# PDCA Plan: UI-Classroom

## 1. 개요
- 목표: NoteSync.ai 프론트엔드의 내 강의실(MyLectureRoomScreen) 대시보드 및 업로드 팝업 UI의 요구사항(PRD) 충족 및 디테일 보완.
- 배경: 현재 MVP 보일러플레이트에 기본적인 컴포넌트 구조(폴더 생성, 업로드 폼, 폴링 등)는 작성되어 있으나, 일부 기능(폴더별 필터링, Processing 상태별 제약 규칙, 실제 파일 Drag & Drop 처리 등)이 누락되어 있습니다. 이를 보완하여 완전한 형태의 사용자 화면을 구현합니다.

## 2. 작업 범위 (Scope)
1. **내 강의실 페이지 (MyLectureRoomScreen & Sidebar)**
   - 탭 필터링 연동 (API Refetch): 좌측 사이드바에서 `전체 보드` 또는 특정 `폴더` 클릭 시 상태값을 유지하고, 클라이언트 단에서 배열을 필터링(`array.filter`)하는 대신 백엔드로 **GET /boards?folder_id={id} API를 다시 호출(Refetch)**하여 서버를 단일 진실 공급원(SSOT)으로 유지하도록 수정.
   - Processing/Failed 항목 제약 규칙 적용: `LectureTable.tsx`의 더보기(`...`) 메뉴에서 `Processing` 중인 보드는 `삭제하기`만 노출. 실패(`Failed`) 상태인 보드는 `재시도` 액션 추가 연동 (백엔드에 `POST /boards/{id}/retry` 등 관련 API가 뚫려 있는지 확인 후 연동).
2. **업로드 팝업 (UploadLectureModal & DropZones)**
   - Drag & Drop 구현 (라이브러리 사용): 네이티브 HTML5 이벤트(`onDragOver` 등)를 직접 구현할 때 발생하는 이벤트 버블링이나 브라우저 기본 동작 제어 등 엣지 케이스를 피하기 위해, 업계 표준인 **`react-dropzone` 패키지를 설치**하여 빠르고 안정적으로 구현.
   - 단일 파일 제한 처리.
3. **상태/에러 표기 고도화**
   - 시안과 PRD에 명시된 에러 메시지(미디어 필수, PDF만 허용 등) 검증 및 UI 피드백 강화.

## 3. 세부 구현 계획
1. **상태값 추가 및 API Refetch**: `MyLectureRoomScreen.tsx`에 `selectedFolderId` 상태를 추가하고, 이 상태가 변경될 때마다(useEffect 혹은 이벤트 핸들러에서) `fetchBoards({ folderId: selectedFolderId })` 형태로 데이터를 다시 가져와 목록을 갱신.
   - **(중요) 폴링(Polling)과 필터링 충돌 방지**: 백그라운드에서 진행되는 3초 주기 폴링 로직(`setInterval`)이 상태를 갱신할 때 파라미터 없이 `GET /boards`를 호출해 현재 화면을 전체 목록으로 덮어씌우는 버그가 발생하지 않도록, 폴링 API 재호출 시에도 반드시 현재 활성화된 `selectedFolderId`를 파라미터로 포함하여(refetch) 호출하도록 `useEffect` 의존성 및 로직을 설계.
2. **메뉴 제어**: `LectureTable.tsx`의 `LectureRow` 컴포넌트 내 더보기 메뉴 배열을 `isProcessing` 및 `isFailed` 조건에 따라 동적으로 구성. 실패 시 백엔드 재시도 API(`POST /boards/{id}/retry`) 호출 연동.
3. **DnD 라이브러리 적용**: 프론트엔드에 `react-dropzone`을 설치하고, `FileDropZone.tsx` 및 `OptionalPdfDropZone.tsx` 내부를 `useDropzone` 훅을 사용하도록 리팩토링.

## 4. 예상 일정
- 1 스프린트 내 완료 목표. 프론트엔드의 React 상태, API 연동 및 외부 패키지 적용 위주로 진행됩니다.

## 5. 성공 기준 (AC)
- [ ] 첫 진입 시 `전체 보드` 탭이 활성화되며, 폴더 클릭 시 API를 다시 호출하여 해당 폴더의 보드만 테이블에 나타난다.
- [ ] Processing 보드의 더보기 메뉴에는 오직 `삭제하기`만 나타난다.
- [ ] Failed 상태의 보드는 `재시도` 버튼/메뉴가 표시되며 백엔드 API와 연동되어 동작한다.
- [ ] 업로드 팝업 내 영역에 `react-dropzone`을 기반으로 파일을 드래그 앤 드롭하여 안정적으로 파일을 선택할 수 있다.