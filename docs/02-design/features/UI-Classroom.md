# PDCA Design: UI-Classroom

## 1. 개요
본 설계 문서는 `UI-Classroom.md` 플랜 문서에 따라 내 강의실(`MyLectureRoomScreen`)의 폴더 필터링(API Refetch), 폴링 로직 충돌 방지, `LectureTable` 메뉴 제어 및 `react-dropzone`을 활용한 업로드 팝업 UI 구현을 위한 프론트엔드 아키텍처 및 상세 구현 방안을 정의합니다.

## 2. 상태 관리 및 API 연동 설계 (`MyLectureRoomScreen`)

### 2.1 폴더 필터링 API Refetch
- **기존 방식**: 모든 보드를 한 번에 불러와 클라이언트 단에서 `array.filter` 수행.
- **변경 방식**: `selectedFolderId` 상태 변경 시 API 호출 자체를 해당 폴더 기준으로 수행 (SSOT 유지).
- **API 시그니처 (Frontend)**:
  `fetchBoards(folderId?: number | null)` 형태로 파라미터를 받을 수 있도록 `frontend/src/features/lectures/api.ts` 수정 필요.

### 2.2 폴링(Polling) 로직 충돌 방지
- **이슈 원인**: Processing 상태인 항목을 확인하기 위해 3초마다 `fetchBoardStatus`를 호출하고, 상태 변화(완료/실패)가 감지되면 전체 목록을 새로고침(`reloadLectureRoom`)하는데, 이때 `folderId` 인자 없이 `fetchBoards()`를 호출하면 현재 필터링 뷰가 풀려버림.
- **해결 방안**:
  `reloadLectureRoom` 함수 내부 혹은 폴링 트리거 시, **현재 선택된 `selectedFolderId`**를 참조하여 `fetchBoards(selectedFolderId)`를 호출하도록 의존성(`useCallback`, `useEffect`)을 엄격히 관리.

```typescript
// MyLectureRoomScreen.tsx 구조화 예시
const reloadLectureRoom = useCallback(async (currentFolderId: number | null) => {
  setErrorMessage(null);
  const [nextBoards, nextFolders] = await Promise.all([
    fetchBoards(currentFolderId), // <-- 파라미터 전달!
    fetchFolders()
  ]);
  setLectures(nextBoards);
  setFolders(nextFolders);
}, []);

useEffect(() => {
  // selectedFolderId가 바뀔 때마다 Refetch
  void reloadLectureRoom(selectedFolderId);
}, [selectedFolderId, reloadLectureRoom]);
```

## 3. LectureTable & 메뉴 제어 설계

### 3.1 조건부 메뉴 렌더링
- `LectureTable.tsx` (또는 내부 Row 컴포넌트)에서 각 `LectureItem`의 `status`를 확인.
- `status === 'processing'`:
  - [삭제하기] 만 노출
- `status === 'failed'`:
  - [재시도], [삭제하기] 등 노출
  - 재시도 클릭 시 백엔드 `POST /boards/{id}/retry` 호출
- `status === 'completed'`:
  - [이름 변경], [폴더 이동], [삭제하기] 등 노출

### 3.2 Retry API 추가 (`api.ts`)
```typescript
export async function retryBoard(boardId: number): Promise<void> {
  const response = await fetch(`/api/boards/${boardId}/retry`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("재시도 요청에 실패했습니다.");
  }
}
```

## 4. 업로드 팝업 설계 (`react-dropzone`)

### 4.1 의존성 추가
- `npm install react-dropzone` (이미 설치되지 않은 경우 추가)

### 4.2 `FileDropZone.tsx` 및 `OptionalPdfDropZone.tsx`
- HTML5 네이티브 DnD 이벤트를 제거하고 `useDropzone` 훅을 사용.

```typescript
// FileDropZone.tsx 설계 예시
import { useDropzone } from 'react-dropzone';

export function FileDropZone({ onFileSelect, file }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles && acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]); // 단일 파일 제한
      }
    },
    accept: {
      'audio/*': [],
      'video/*': [],
    },
    multiple: false,
  });

  return (
    <div {...getRootProps()} className={`... ${isDragActive ? 'border-blue-500 bg-blue-50' : ''}`}>
      <input {...getInputProps()} />
      {/* ... 기존 UI 내용 (드래그 활성화 시 피드백 강화) ... */}
    </div>
  );
}
```

## 5. 단계별 실행 계획 (Action Items)

1. [ ] 프론트엔드 API 클라이언트(`api.ts`) 수정: `fetchBoards`에 `folderId` 파라미터 지원 및 `retryBoard` 함수 추가 (백엔드 스펙 확인 필).
2. [ ] `MyLectureRoomScreen.tsx` 수정:
   - `selectedFolderId` 기반 `fetchBoards` 호출(Refetch) 로직 구현.
   - 폴링 완료 시 `selectedFolderId`를 유지하며 리로드 하도록 로직 수정.
   - 클라이언트 사이드 필터링(`filteredLectures`) 제거.
3. [ ] `LectureTable.tsx` 수정: 상태(`processing`, `failed`)에 따른 조건부 메뉴 렌더링.
4. [ ] `npm install react-dropzone` 패키지 설치.
5. [ ] `FileDropZone.tsx`, `OptionalPdfDropZone.tsx` 컴포넌트를 `react-dropzone` 훅으로 리팩토링.
6. [ ] 업로드 검증 로직(미디어 필수, PDF 확장자 등) 및 UI 피드백 적용.
