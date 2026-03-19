# 도메인 모델 명세 (MVP)

## 1. 목표
- `User > Folder(강의명) > Board(강의 주제)` 구조를 데이터 모델로 고정한다.
- Processing 상태 추적과 스크립트 세그먼트 저장을 분리하여 확장성을 확보한다.

## 2. 엔터티
## users
- id (PK)
- email (nullable in MVP)
- display_name
- created_at
- updated_at

## folders
- id (PK)
- user_id (FK -> users.id)
- name (강의명)
- created_at
- updated_at
- 제약
- `(user_id, name)` unique (동일 사용자 내 폴더명 중복 불허)

## boards
- id (PK)
- user_id (FK -> users.id)
- folder_id (FK -> folders.id)
- title (강의 주제)
- media_duration_sec (nullable, 처리 완료 후 확정)
- status (queued | processing | postprocessing | completed | failed)
- created_at
- updated_at
- failed_reason (nullable)

## board_assets
- id (PK)
- board_id (FK -> boards.id)
- user_id (FK -> users.id)
- asset_type (media | pdf)
- original_filename
- mime_type
- byte_size
- storage_key
- created_at

## processing_jobs
- id (PK)
- board_id (FK -> boards.id)
- user_id (FK -> users.id)
- stage (queued | extract_pdf | keywords | stt | postprocess | done | failed)
- progress_percent (0-100)
- message (nullable)
- started_at (nullable)
- finished_at (nullable)
- created_at

## transcript_segments
- id (PK)
- board_id (FK -> boards.id)
- user_id (FK -> users.id)
- seq (세그먼트 순서)
- start_ms
- end_ms
- text
- source_type (stt_draft | llm_refined | user_edited)
- created_at
- updated_at

## 3. 관계
- users 1:N folders
- users 1:N boards
- folders 1:N boards
- boards 1:N board_assets
- boards 1:N transcript_segments
- boards 1:N processing_jobs

## 4. 상태 전이
- boards.status
- queued -> processing -> postprocessing -> completed
- queued/processing/postprocessing -> failed
- 재처리 시 failed -> processing 허용

- processing_jobs.stage
- queued -> extract_pdf(선택) -> keywords(선택) -> stt -> postprocess -> done
- 어느 단계에서든 failed 가능

## 5. 파일 정책
- 미디어 파일: 필수 1개
- 자료 파일: PDF 선택 1개
- ppt/pptx는 MVP 범위에서 불허
- 다중 업로드는 허용하지 않음(미디어 1개 + PDF 0~1개)
- 권장 제한
- media <= 2GB
- pdf <= 100MB

## 6. 타임스탬프 불변 규칙
- 후보정 전후 세그먼트 수가 동일해야 한다.
- 각 세그먼트의 `[start_ms, end_ms]`는 변경 불가다.
- 위반 시 postprocess 실패 처리 후 `boards.status=failed`로 전환한다.

## 7. 조회 규칙
- 내 강의실 기본 탭은 전체 보드
- 목록 정렬 기본값
- 1순위: processing 상태 우선
- 2순위: created_at DESC
- Processing 상태 항목의 행 액션은 삭제만 허용
- failed 상태 항목의 복구 액션 라벨은 `재시도`

## 8. 인덱스 권장
- folders(user_id, name)
- boards(user_id, folder_id, created_at)
- boards(user_id, status, created_at)
- processing_jobs(board_id, created_at)
- transcript_segments(board_id, seq)

## 9. 향후 확장 포인트
- board_assets.asset_type에 `slides_image_zip` 등 추가 가능
- transcript_segments에 화자 분리(speaker) 컬럼 추가 가능
- 폴더 공유/협업을 위한 ACL 테이블 추가 가능

---

## [파이프라인/상태전이/마이그레이션/테스트 가이드](pipeline-flow.md)
- 파이프라인 상태전이/실패/재시도 플로우 다이어그램
- Alembic 마이그레이션/롤백/테스트 실행법/개발환경 세팅 요약
