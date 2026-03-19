# PDCA Plan: Core API

## 1. 개요
- 목표: NoteSync.ai 백엔드의 핵심 도메인 (User, Folder, Board, BoardAsset 등) 및 관련 CRUD API의 완결성 검증 및 버그 수정.
- 배경: 현재 `app/db/models.py`, `app/api/routes`, `app/services` 및 관련 테스트 코드가 상당 부분 구현되어 있으나, 테스트를 실행해본 결과 일부 실패하는 항목이 발견되었으며 비즈니스 로직(예: 폴더 삭제 정책)에 누락된 부분이 존재합니다.

## 2. 작업 범위 (Scope)
- **Folder 서비스 로직 수정**: 
  - 보드가 존재하는 폴더 삭제 시도시 `409 Conflict (FolderNotEmptyError)` 예외가 발생하도록 `FolderService.delete_folder` 수정. (현재는 Cascade 삭제가 동작하도록 되어 있어, 요구사항/테스트와 불일치함)
- **Upload API 테스트 픽스 (Mocking 적용)**:
  - `UploadApiTest` 실행 중 발생하는 `BoardStatus.FAILED` 원인 파악 및 해결.
  - 원인: 테스트 환경에서 가짜 파일 바이트(`b"fake-media-content"`)를 넘겨 실제 AI 파이프라인(`faster-whisper`, `pypdf`)을 구동하려다 파싱 에러 및 라이브러리 에러 발생.
  - 조치: 해당 테스트에서 AI 파이프라인 처리를 모킹(Mock)하여, 정상적으로 `BoardStatus.COMPLETED` 상태에 도달할 수 있도록 테스트 코드 리팩토링.
- **Core API 테스트 전체 통과 확인**:
  - `pytest` 실행 결과 41개 테스트 항목 전체가 `PASSED` 상태가 되도록 보장.

## 3. 세부 구현 계획
1. `backend/app/services/folder_service.py` 수정
   - `delete_folder` 메서드에서 해당 폴더의 보드 존재 여부(count)를 확인 후, 1개 이상 존재 시 `FolderNotEmptyError()` 발생시키도록 변경.
2. `backend/tests/test_upload_api.py` 수정
   - `test_upload_creates_board_assets_and_background_result` 및 `test_upload_without_pdf_skips_pdf_stage_and_completes`에서 의존하는 `ai_pipeline.process` 로직을 Mocking 처리 (더미 세그먼트를 반환하도록 수정).
3. `pytest tests/`를 통한 최종 검증.

## 4. 예상 일정
- 코드 베이스가 대부분 준비되어 있으므로, 1 스프린트(단기) 내 즉시 수정 및 검증 가능.

## 5. 성공 기준 (AC)
- [ ] `pytest tests/` 실행 시 모든 테스트 케이스(41/41) 통과.
- [ ] 보드가 있는 폴더 삭제 시 409 에러 정상 반환 확인.
