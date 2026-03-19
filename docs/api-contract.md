# API 계약서 (MVP, FastAPI)

상세 구현 설계는 [docs/backend-api-design.md](docs/backend-api-design.md)를 기준으로 한다.

## 1. 공통
- 인증
- MVP: 기본 미들웨어에서 `user_id=1` 주입
- Content-Type
- `application/json`
- 파일 업로드는 `multipart/form-data`
- 시간/길이 단위
- duration: 초(sec)
- 세그먼트: 밀리초(ms)

## 2. 엔드포인트 요약
- `POST /folders`
- `GET /folders`
- `PATCH /folders/{folder_id}`
- `DELETE /folders/{folder_id}`
- `POST /boards/upload`
- `GET /boards`
- `GET /boards/{board_id}`
- `GET /boards/{board_id}/status`
- `PATCH /boards/{board_id}`
- `PUT /boards/{board_id}/segments`
- `DELETE /boards/{board_id}`
- `POST /boards/{board_id}/retry`
- `GET /files/{asset_id}`

## 3. 상세 계약
## 3.1 POST /boards/upload
### 목적
- Folder/Board를 생성하고, 미디어/PDF 파일을 저장한 뒤 비동기 처리 작업을 시작한다.

### Request (multipart/form-data)
- `folder_name` (string, required)
- `board_title` (string, required)
- `media_file` (file, required)
- `pdf_file` (file, optional, PDF only)

### Validation
- folder_name/board_title 공백 불가
- media_file 필수
- pdf_file이 존재하면 MIME/확장자 PDF 검증
- media_file은 단일 파일만 허용
- pdf_file은 단일 파일만 허용
- 용량 제한 초과 시 413

### Response 202
```json
{
  "board_id": 101,
  "status": "queued",
  "processing_job": {
    "stage": "queued",
    "progress_percent": 0,
    "message": "업로드 완료, 처리 대기 중"
  }
}
```

### Error
- 400: 필수 값 누락/형식 오류
- 413: 파일 크기 초과
- 415: 지원하지 않는 파일 형식

## 3.2 GET /boards
### 목적
- 내 강의실 목록 조회(전체/폴더 탭 지원)

### Query
- `folder_id` (optional)
- `status` (optional)
- `q` (optional, 제목 검색)
- `page` (default 1)
- `size` (default 20)

### Response 200
```json
{
  "items": [
    {
      "id": 101,
      "folder": { "id": 11, "name": "운영체제" },
      "title": "교착상태와 회피",
      "status": "processing",
      "media_duration_sec": null,
      "created_at": "2026-03-10T10:00:00Z",
      "progress": {
        "stage": "stt",
        "progress_percent": 52
      }
    }
  ],
  "page": 1,
  "size": 20,
  "total": 1
}
```

### 정렬 규칙(서버 기본)
- processing 상태 우선
- created_at DESC

## 3.3 GET /boards/{board_id}
### 목적
- 보드 상세 조회(헤더/자산/스크립트 세그먼트)

### Response 200
```json
{
  "id": 101,
  "folder": { "id": 11, "name": "운영체제" },
  "title": "교착상태와 회피",
  "status": "completed",
  "media": {
    "url": "/files/media/abc",
    "mime_type": "video/mp4",
    "duration_sec": 3220
  },
  "pdf": {
    "url": "/files/pdf/def",
    "filename": "week3.pdf"
  },
  "segments": [
    {
      "seq": 1,
      "start_ms": 0,
      "end_ms": 5000,
      "text": "[00:00 -> 00:05] ..."
    }
  ]
}
```

## 3.4 GET /boards/{board_id}/status
### 목적
- 단일 보드의 진행 상태를 폴링으로 조회한다.

### Response 200
```json
{
  "board_id": 101,
  "status": "processing",
  "stage": "postprocess",
  "progress_percent": 86,
  "message": "스크립트 후보정 중",
  "updated_at": "2026-03-10T10:03:00Z"
}
```

### 실패 예시
```json
{
  "board_id": 101,
  "status": "failed",
  "stage": "failed",
  "progress_percent": 100,
  "message": "PDF 텍스트 추출 실패"
}
```

## 3.5 PATCH /boards/{board_id}
### 목적
- 보드 제목 변경, 폴더 이동, 스크립트 수정

### Request 예시
```json
{
  "title": "교착상태 예방 기법",
  "folder_id": 12
}
```

### Response 200
- 갱신된 보드 메타데이터 반환

## 3.6 DELETE /boards/{board_id}
### 목적
- 보드 및 연관 자산/세그먼트/작업 삭제
- Processing 상태에서도 허용되는 유일한 행 액션이다.

### Response 204
- 본문 없음

## 3.7 POST /folders
### Request
```json
{
  "name": "알고리즘"
}
```

### Response 201
```json
{
  "id": 31,
  "name": "알고리즘"
}
```

### Error
- 409: 동일 사용자 내 중복 폴더명(`DUPLICATE_FOLDER_NAME`)

## 3.9 POST /boards/{board_id}/retry
### 목적
- failed 상태 보드를 재처리 큐로 되돌린다.
- 프론트 버튼 라벨은 `재시도`로 고정한다.

### Response 200
```json
{
  "id": 101,
  "status": "processing",
  "action": "재시도"
}
```

## 3.8 GET /folders
### Response 200
```json
{
  "items": [
    { "id": 11, "name": "운영체제", "board_count": 4 }
  ]
}
```

## 3.10 PATCH /folders/{folder_id}
### 목적
- 폴더 이름을 변경한다.

### Request 예시
```json
{
  "name": "운영체제-심화"
}
```

### Response 200
```json
{
  "id": 11,
  "name": "운영체제-심화",
  "created_at": "2026-03-10T10:00:00Z",
  "updated_at": "2026-03-11T12:00:00Z"
}
```

### Error
- 404: 폴더 없음 (`FOLDER_NOT_FOUND`)
- 409: 동일 이름 폴더 존재 (`DUPLICATE_FOLDER_NAME`)

## 3.11 DELETE /folders/{folder_id}
### 목적
- 비어있는 폴더를 삭제한다.

### Response 204
- 본문 없음

### Error
- 404: 폴더 없음 (`FOLDER_NOT_FOUND`)
- 409: 폴더에 보드가 존재함 (`FOLDER_NOT_EMPTY`)

## 4. 처리 파이프라인 계약
- 업로드 수락 시 즉시 202 반환
- 파이프라인 실행 모드는 `NOTESYNC_AI_PIPELINE_MODE`로 제어 (`mock` 기본값, `real` 선택)
- 백그라운드 단계
1. PDF 텍스트 추출(있을 때만)
2. 키워드 추출(있을 때만)
3. Whisper STT 초안 생성
4. Gemini 후보정
5. 타임스탬프 불변 검증
- 검증 실패 시 `failed` 처리
- PDF 파일이 없는 업로드는 허용하며 1~2단계를 스킵한다.

## 5. 프론트 연동 규칙
- 내 강의실 진입 후 3초 주기로 processing 항목에 대해 `GET /boards/{id}/status` 폴링
- 상태가 completed/failed가 되면 목록 재조회
- processing 항목은 클릭 비활성 + 회색 텍스트 + progress bar 표시

## 6. 에러 포맷 표준
모든 에러 응답은 아래 구조를 사용한다.

```json
{
  "code": "UNSUPPORTED_FILE_TYPE",
  "message": "PDF 파일만 업로드할 수 있습니다.",
  "details": null
}
```

- `code`: 에러 식별 코드(문자열)
- `message`: 사용자/클라이언트 표시 메시지
- `details`: 부가 정보(없으면 `null`, 검증 오류면 배열)

### 422 Validation Error 예시
```json
{
  "code": "VALIDATION_ERROR",
  "message": "요청 값이 올바르지 않습니다.",
  "details": [
    {
      "loc": ["body", "name"],
      "msg": "Field required",
      "type": "missing"
    }
  ]
}
```

## 7. 보안/확장 고려
- 저장소는 Storage Service 인터페이스를 통해 접근
- 로컬 디스크 경로는 외부에 직접 노출하지 않음
- 이후 S3 전환 시 URL 서명 전략 적용 가능

## 8. 구현 현황 (2026-03-11)
- 현재 문서의 요약 계약에 해당하는 API가 모두 구현되어 있다.
- 구현 기준 상세는 [docs/backend-api-design.md](docs/backend-api-design.md)를 단일 기준으로 사용한다.
- 구현된 백엔드 API 목록:
  - `POST /folders`
  - `GET /folders`
  - `PATCH /folders/{folder_id}`
  - `DELETE /folders/{folder_id}`
  - `POST /boards/upload`
  - `GET /boards`
  - `GET /boards/{board_id}`
  - `GET /boards/{board_id}/status`
  - `PATCH /boards/{board_id}`
  - `PUT /boards/{board_id}/segments`
  - `DELETE /boards/{board_id}`
  - `POST /boards/{board_id}/retry`
  - `GET /files/{asset_id}`

## 9. 검증 명령
백엔드 루트에서 실행:

```bash
PYTHONPATH=. python -m unittest discover -s tests -v
```

커넥션 누수 경고를 에러로 승격한 검증:

```bash
PYTHONWARNINGS=error::ResourceWarning PYTHONTRACEMALLOC=1 PYTHONPATH=. python -m unittest discover -s tests -v
```

---

## [파이프라인/마이그레이션/테스트/개발환경 가이드](pipeline-flow.md)
- 파이프라인 상태전이/실패/재시도 플로우 다이어그램
- Alembic 마이그레이션/롤백/테스트 실행법/개발환경 세팅 요약

### [정책] 상태값/Enum 표준화
- 모든 상태값(BoardStatus, ProcessingJob.stage 등)은 프론트/문서/코드가 일치하도록 표준화한다.
- 파이프라인 단계(stage)는 다음 문자열로 응답된다: `queued`, `extract_pdf`, `keywords`, `stt`, `postprocess`, `done`
- Enum 변환 로직은 backend에서 일괄 적용되어, 프론트는 위 문자열만 해석하면 된다.
- 정책/문서/코드/프론트 Enum 값이 다를 경우, 반드시 협의 후 일괄 반영한다.
