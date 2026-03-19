# 백엔드 API/DB 상세 설계 (MVP)

## 1. 문서 목적
- 본 문서는 MVP 백엔드 구현 기준 문서다.
- 기존 [docs/api-contract.md](docs/api-contract.md)의 요약 계약을 구현 가능한 수준으로 세분화한다.
- 범위는 테이블 설계, 엔드포인트 명세, 요청/응답 데이터 구조, API별 DB 읽기/쓰기 범위다.

## 2. 설계 원칙
- 인증은 MVP에서 미들웨어가 `user_id=1`을 주입한다고 가정한다.
- 모든 핵심 리소스는 사용자 소유권을 가진다.
- 업로드 요청은 즉시 202를 반환하고, 무거운 처리는 비동기로 진행한다.
- Processing 상태 추적은 `boards.status`와 `processing_jobs`를 함께 사용한다.
- 스크립트 편집은 보드 메타데이터 수정과 분리한다.
- 파일 정책은 `media 1개 필수 + pdf 0~1개`다.

## 3. 전체 리소스 구조
- User: 서비스 사용자
- Folder: 강의명 단위 컨테이너
- Board: 강의 주제 단위 리소스
- BoardAsset: 업로드된 실제 파일 메타데이터
- ProcessingJob: 비동기 처리 단계 추적
- TranscriptSegment: 시간 구간별 스크립트

## 4. 테이블 설계

### 4.1 users
| 컬럼 | 타입 | NULL | 설명 |
| --- | --- | --- | --- |
| id | integer PK | N | 사용자 식별자 |
| email | varchar(255) | Y | MVP에서는 nullable |
| display_name | varchar(100) | N | 사용자 표시명 |
| created_at | datetime | N | 생성 시각 |
| updated_at | datetime | N | 수정 시각 |

용도
- 모든 핵심 리소스의 소유권 기준 테이블이다.

### 4.2 folders
| 컬럼 | 타입 | NULL | 설명 |
| --- | --- | --- | --- |
| id | integer PK | N | 폴더 식별자 |
| user_id | integer FK -> users.id | N | 소유 사용자 |
| name | varchar(200) | N | 강의명 |
| created_at | datetime | N | 생성 시각 |
| updated_at | datetime | N | 수정 시각 |

제약 및 인덱스
- unique `(user_id, name)`
- index `(user_id, name)`

용도
- 좌측 사이드바 폴더 목록, 보드 업로드 시 강의명 식별에 사용한다.

### 4.3 boards
| 컬럼 | 타입 | NULL | 설명 |
| --- | --- | --- | --- |
| id | integer PK | N | 보드 식별자 |
| user_id | integer FK -> users.id | N | 소유 사용자 |
| folder_id | integer FK -> folders.id | N | 소속 폴더 |
| title | varchar(200) | N | 강의 주제 |
| media_duration_sec | integer | Y | 처리 완료 후 확정 길이 |
| status | enum | N | `queued`, `processing`, `postprocessing`, `completed`, `failed` |
| failed_reason | text | Y | 실패 사유 |
| created_at | datetime | N | 생성 시각 |
| updated_at | datetime | N | 수정 시각 |

제약 및 인덱스
- check `media_duration_sec >= 0` 또는 null
- index `(user_id, folder_id, created_at)`
- index `(user_id, status, created_at)`

용도
- 목록/상세/상태 조회의 중심 테이블이다.

### 4.4 board_assets
| 컬럼 | 타입 | NULL | 설명 |
| --- | --- | --- | --- |
| id | integer PK | N | 자산 식별자 |
| board_id | integer FK -> boards.id | N | 소속 보드 |
| user_id | integer FK -> users.id | N | 소유 사용자 |
| asset_type | enum | N | `media`, `pdf` |
| original_filename | varchar(255) | N | 업로드 원본 파일명 |
| mime_type | varchar(255) | N | MIME 타입 |
| byte_size | integer | N | 파일 크기 |
| storage_key | varchar(500) | N | 저장소 내부 키 |
| created_at | datetime | N | 생성 시각 |

제약 및 인덱스
- unique `(board_id, asset_type)`
- check `byte_size >= 0`

용도
- 파일 저장 위치, 파일 타입, 상세 화면 렌더링 메타데이터를 제공한다.

### 4.5 processing_jobs
| 컬럼 | 타입 | NULL | 설명 |
| --- | --- | --- | --- |
| id | integer PK | N | 작업 식별자 |
| board_id | integer FK -> boards.id | N | 대상 보드 |
| user_id | integer FK -> users.id | N | 소유 사용자 |
| stage | enum | N | `queued`, `extract_pdf`, `keywords`, `stt`, `postprocess`, `done`, `failed` |
| progress_percent | integer | N | 0~100 |
| message | varchar(500) | Y | 사용자 노출 메시지 |
| started_at | datetime | Y | 작업 시작 시각 |
| finished_at | datetime | Y | 작업 종료 시각 |
| created_at | datetime | N | 생성 시각 |

제약 및 인덱스
- check `0 <= progress_percent <= 100`
- index `(board_id, created_at)`

용도
- 폴링용 상태 정보와 파이프라인 이력을 저장한다.

### 4.6 transcript_segments
| 컬럼 | 타입 | NULL | 설명 |
| --- | --- | --- | --- |
| id | integer PK | N | 세그먼트 식별자 |
| board_id | integer FK -> boards.id | N | 대상 보드 |
| user_id | integer FK -> users.id | N | 소유 사용자 |
| seq | integer | N | 세그먼트 순서 |
| start_ms | integer | N | 시작 시각(ms) |
| end_ms | integer | N | 종료 시각(ms) |
| text | text | N | 스크립트 본문 |
| source_type | enum | N | `stt_draft`, `llm_refined`, `user_edited` |
| created_at | datetime | N | 생성 시각 |
| updated_at | datetime | N | 수정 시각 |

제약 및 인덱스
- unique `(board_id, seq)`
- check `seq >= 1`
- check `start_ms >= 0`
- check `end_ms > start_ms`
- index `(board_id, seq)`

용도
- 상세 화면 우측 스크립트 사이드바와 편집 저장의 기준 데이터다.

## 5. 테이블 간 관계
- users 1:N folders
- users 1:N boards
- folders 1:N boards
- boards 1:N board_assets
- boards 1:N processing_jobs
- boards 1:N transcript_segments

## 6. 왜 이 테이블들이 필요한가
- `users`: 향후 멀티유저 전환을 위한 소유권 기준이 필요하다.
- `folders`: 강의명과 강의 주제를 분리해야 UI 사이드바와 목록 필터가 단순해진다.
- `boards`: 상태, 제목, 길이 등 핵심 메타데이터를 보관한다.
- `board_assets`: 로컬 파일 경로 또는 향후 S3 키 같은 저장소 메타데이터를 추상화한다.
- `processing_jobs`: 보드 상태와 별개로 세부 처리 단계와 진행률 이력이 필요하다.
- `transcript_segments`: 상세 조회, 검색, seek, 편집 저장 단위를 분리하기 위해 필요하다.

## 7. 상태 전이 규칙

### 7.1 boards.status
- `queued -> processing -> postprocessing -> completed`
- `queued -> failed`
- `processing -> failed`
- `postprocessing -> failed`
- `failed -> processing` 재시도 허용

### 7.2 processing_jobs.stage
- `queued -> extract_pdf` (PDF가 있을 때만)
- `extract_pdf -> keywords` (PDF 텍스트 추출 성공 시)
- `queued 또는 keywords -> stt`
- `stt -> postprocess`
- `postprocess -> done`
- 모든 단계에서 `failed` 가능
- PDF가 없는 업로드는 `extract_pdf`, `keywords` 단계를 건너뛰고 `stt`부터 시작한다.
- 후보정 결과가 타임스탬프 불변식(개수/seq/start_ms/end_ms)을 위반하면 `failed` 처리한다.

## 8. API 설계 원칙
- `POST /boards/upload`는 생성 + 파일 업로드 + 작업 시작만 담당한다.
- 보드 메타데이터 수정과 스크립트 수정은 별도 API로 분리한다.
- 상세 조회는 화면 렌더링에 필요한 데이터를 한 번에 내려준다.
- 목록 조회는 진행 상태를 최소 비용으로 표시할 수 있도록 latest job 정보를 포함한다.

## 9. 엔드포인트 명세

### 9.1 POST /folders
목적
- 폴더를 생성한다.

Request
```json
{
  "name": "알고리즘"
}
```

Validation
- 공백 문자열 불가
- trim 후 길이 1 이상
- 동일 사용자 내 중복 이름 금지

DB 읽기/쓰기
- read: `folders` 중복 확인
- write: `folders` insert

Response 201
```json
{
  "id": 31,
  "name": "알고리즘",
  "created_at": "2026-03-11T09:00:00Z"
}
```

Error
- 409 `DUPLICATE_FOLDER_NAME`

### 9.2 GET /folders
목적
- 내 폴더 목록과 폴더별 보드 수를 조회한다.

Query
- 없음

DB 읽기/쓰기
- read: `folders`, `boards` 집계
- write: 없음

Response 200
```json
{
  "items": [
    {
      "id": 11,
      "name": "운영체제",
      "board_count": 4,
      "created_at": "2026-03-10T10:00:00Z"
    }
  ]
}
```

### 9.3 POST /boards/upload
목적
- 폴더를 찾거나 생성하고, 보드와 자산 메타데이터를 저장한 뒤 비동기 작업을 등록한다.

Content-Type
- `multipart/form-data`

Form fields
- `folder_name` string required
- `board_title` string required
- `media_file` file required
- `pdf_file` file optional

Validation
- `folder_name`, `board_title` 공백 불가
- `media_file` 필수
- `pdf_file`은 존재 시 PDF만 허용
- media 1개만 허용
- pdf 1개만 허용
- media 최대 2GB
- pdf 최대 100MB

DB 읽기/쓰기
- read: `folders` 동일 이름 조회
- write: `folders` insert optional
- write: `boards` insert
- write: `board_assets` insert 1~2건
- write: `processing_jobs` insert 1건

비동기 후속 처리
1. `boards.status=processing`
2. PDF 있으면 텍스트 추출
3. 키워드 추출
4. STT 초안 생성
5. 세그먼트 저장
6. 후보정 수행
7. 타임스탬프 검증
8. 성공 시 `boards.status=completed`, 실패 시 `boards.status=failed`

Response 202
```json
{
  "board_id": 101,
  "status": "queued",
  "folder": {
    "id": 11,
    "name": "운영체제"
  },
  "processing_job": {
    "id": 9001,
    "stage": "queued",
    "progress_percent": 0,
    "message": "업로드 완료, 처리 대기 중"
  }
}
```

Error
- 400 `INVALID_REQUEST`
- 413 `FILE_TOO_LARGE`
- 415 `UNSUPPORTED_FILE_TYPE`

### 9.4 GET /boards
목적
- 내 강의실 목록을 조회한다.

Query
- `folder_id` optional
- `status` optional
- `q` optional
- `page` default `1`
- `size` default `20`, max `100`

정렬
- 1순위 processing 상태 우선
- 2순위 created_at DESC

DB 읽기/쓰기
- read: `boards`, `folders`, latest `processing_jobs`
- write: 없음

Response 200
```json
{
  "items": [
    {
      "id": 101,
      "folder": {
        "id": 11,
        "name": "운영체제"
      },
      "title": "교착상태와 회피",
      "status": "processing",
      "failed_reason": null,
      "media_duration_sec": null,
      "created_at": "2026-03-10T10:00:00Z",
      "updated_at": "2026-03-10T10:03:00Z",
      "progress": {
        "job_id": 9001,
        "stage": "stt",
        "progress_percent": 52,
        "message": "음성 인식 중"
      },
      "actions": {
        "can_open": false,
        "can_rename": false,
        "can_move": false,
        "can_delete": true,
        "can_retry": false
      }
    }
  ],
  "page": 1,
  "size": 20,
  "total": 1
}
```

### 9.5 GET /boards/{board_id}
목적
- 보드 상세 화면 진입에 필요한 데이터를 한 번에 조회한다.

DB 읽기/쓰기
- read: `boards`, `folders`, `board_assets`, latest `processing_jobs`, `transcript_segments`
- write: 없음

Response 200
```json
{
  "id": 101,
  "folder": {
    "id": 11,
    "name": "운영체제"
  },
  "title": "교착상태와 회피",
  "status": "completed",
  "failed_reason": null,
  "media": {
    "asset_id": 501,
    "filename": "week3.mp4",
    "mime_type": "video/mp4",
    "duration_sec": 3220,
    "url": "/files/media/abc"
  },
  "pdf": {
    "asset_id": 502,
    "filename": "week3.pdf",
    "mime_type": "application/pdf",
    "url": "/files/pdf/def"
  },
  "progress": {
    "job_id": 9001,
    "stage": "done",
    "progress_percent": 100,
    "message": "처리가 완료되었습니다."
  },
  "segments": [
    {
      "id": 7001,
      "seq": 1,
      "start_ms": 0,
      "end_ms": 5000,
      "text": "[00:00 -> 00:05] 교착 상태를 설명하겠습니다.",
      "source_type": "llm_refined",
      "updated_at": "2026-03-10T10:08:00Z"
    }
  ],
  "created_at": "2026-03-10T10:00:00Z",
  "updated_at": "2026-03-10T10:08:00Z"
}
```

Error
- 404 `BOARD_NOT_FOUND`

### 9.6 GET /boards/{board_id}/status
목적
- processing 중인 단일 보드 상태를 폴링한다.

DB 읽기/쓰기
- read: `boards`, latest `processing_jobs`
- write: 없음

Response 200
```json
{
  "board_id": 101,
  "status": "processing",
  "stage": "postprocess",
  "progress_percent": 86,
  "message": "스크립트 후보정 중",
  "failed_reason": null,
  "updated_at": "2026-03-10T10:03:00Z"
}
```

실패 예시
```json
{
  "board_id": 101,
  "status": "failed",
  "stage": "failed",
  "progress_percent": 100,
  "message": "PDF 텍스트 추출 실패",
  "failed_reason": "PDF 파싱 중 텍스트를 추출하지 못했습니다.",
  "updated_at": "2026-03-10T10:03:00Z"
}
```

### 9.7 PATCH /boards/{board_id}
목적
- 보드 제목 변경 또는 폴더 이동을 처리한다.

Request
```json
{
  "title": "교착상태 예방 기법",
  "folder_id": 12
}
```

Validation
- 둘 중 하나 이상은 포함되어야 한다.
- `title`은 공백 불가
- `folder_id`는 사용자 소유 폴더여야 한다.
- processing 상태에서도 이름 변경/이동은 허용하지 않는다.

DB 읽기/쓰기
- read: `boards`, `folders`
- write: `boards` update

Response 200
```json
{
  "id": 101,
  "folder": {
    "id": 12,
    "name": "운영체제-심화"
  },
  "title": "교착상태 예방 기법",
  "status": "completed",
  "updated_at": "2026-03-11T09:30:00Z"
}
```

Error
- 400 `INVALID_BOARD_UPDATE`
- 404 `BOARD_NOT_FOUND`
- 409 `BOARD_LOCKED`

### 9.8 PUT /boards/{board_id}/segments
목적
- 세그먼트 텍스트 편집 결과를 일괄 저장한다.

설계 이유
- 보드 메타데이터 수정 API와 스크립트 저장 API를 분리해야 관심사가 명확하다.
- 타임스탬프 불변 규칙 검증도 별도 엔드포인트가 더 단순하다.

Request
```json
{
  "segments": [
    {
      "id": 7001,
      "seq": 1,
      "start_ms": 0,
      "end_ms": 5000,
      "text": "교착 상태를 설명하겠습니다."
    },
    {
      "id": 7002,
      "seq": 2,
      "start_ms": 5000,
      "end_ms": 10000,
      "text": "필요 조건부터 보겠습니다."
    }
  ]
}
```

Validation
- 세그먼트 개수는 기존과 동일해야 한다.
- `id`, `seq`, `start_ms`, `end_ms`는 기존 값과 동일해야 한다.
- 수정 가능한 것은 `text`만이다.
- processing 상태에서는 편집 저장 불가

DB 읽기/쓰기
- read: `boards`, `transcript_segments`
- write: `transcript_segments` bulk update
- write: `boards.updated_at` update optional

Response 200
```json
{
  "board_id": 101,
  "saved_count": 2,
  "status": "completed",
  "updated_at": "2026-03-11T09:40:00Z"
}
```

Error
- 400 `INVALID_SEGMENT_UPDATE`
- 404 `BOARD_NOT_FOUND`
- 409 `BOARD_LOCKED`

### 9.9 DELETE /boards/{board_id}
목적
- 보드와 연관 자산, 작업, 세그먼트를 모두 삭제한다.

정책
- processing 상태에서도 허용되는 유일한 행 액션이다.

DB 읽기/쓰기
- read: `boards`
- write: `boards` delete
- cascade delete: `board_assets`, `processing_jobs`, `transcript_segments`

Response 204
- 본문 없음

### 9.10 POST /boards/{board_id}/retry
목적
- failed 상태 보드를 재처리 큐로 되돌린다.

Validation
- failed 상태일 때만 허용

DB 읽기/쓰기
- read: `boards`, `board_assets`
- write: `boards.status=processing` 또는 `queued`
- write: `boards.failed_reason=null`
- write: `processing_jobs` insert 1건

Response 200
```json
{
  "id": 101,
  "status": "processing",
  "action": "재시도",
  "processing_job": {
    "id": 9002,
    "stage": "queued",
    "progress_percent": 0,
    "message": "재처리 대기 중"
  }
}
```

Error
- 404 `BOARD_NOT_FOUND`
- 409 `BOARD_NOT_RETRYABLE`

### 9.11 GET /files/{asset_id}
목적
- 미디어/PDF 자산을 스트리밍 또는 다운로드한다.

설계 이유
- `storage_key`를 외부에 직접 노출하지 않기 위해 파일 접근은 별도 API로 감싼다.

DB 읽기/쓰기
- read: `board_assets`, `boards`
- write: 없음

Response 200
- 파일 스트림 반환

Error
- 404 `ASSET_NOT_FOUND`

## 10. API별 읽기/쓰기 테이블 요약
| API | Read Tables | Write Tables |
| --- | --- | --- |
| POST /folders | folders | folders |
| GET /folders | folders, boards | - |
| POST /boards/upload | folders | folders, boards, board_assets, processing_jobs |
| GET /boards | boards, folders, processing_jobs | - |
| GET /boards/{id} | boards, folders, board_assets, processing_jobs, transcript_segments | - |
| GET /boards/{id}/status | boards, processing_jobs | - |
| PATCH /boards/{id} | boards, folders | boards |
| PUT /boards/{id}/segments | boards, transcript_segments | transcript_segments, boards |
| DELETE /boards/{id} | boards | boards, board_assets, processing_jobs, transcript_segments |
| POST /boards/{id}/retry | boards, board_assets | boards, processing_jobs |
| GET /files/{asset_id} | board_assets, boards | - |

## 11. 요청/응답 DTO 권장 구조

### 11.1 Folder DTO
```json
{
  "id": 11,
  "name": "운영체제",
  "board_count": 4,
  "created_at": "2026-03-10T10:00:00Z"
}
```

### 11.2 Board Summary DTO
```json
{
  "id": 101,
  "folder": {
    "id": 11,
    "name": "운영체제"
  },
  "title": "교착상태와 회피",
  "status": "processing",
  "failed_reason": null,
  "media_duration_sec": null,
  "created_at": "2026-03-10T10:00:00Z",
  "updated_at": "2026-03-10T10:03:00Z",
  "progress": {
    "job_id": 9001,
    "stage": "stt",
    "progress_percent": 52,
    "message": "음성 인식 중"
  }
}
```

### 11.3 Board Detail DTO
```json
{
  "id": 101,
  "folder": {
    "id": 11,
    "name": "운영체제"
  },
  "title": "교착상태와 회피",
  "status": "completed",
  "failed_reason": null,
  "media": {
    "asset_id": 501,
    "filename": "week3.mp4",
    "mime_type": "video/mp4",
    "duration_sec": 3220,
    "url": "/files/501"
  },
  "pdf": {
    "asset_id": 502,
    "filename": "week3.pdf",
    "mime_type": "application/pdf",
    "url": "/files/502"
  },
  "segments": []
}
```

### 11.4 Segment DTO
```json
{
  "id": 7001,
  "seq": 1,
  "start_ms": 0,
  "end_ms": 5000,
  "text": "교착 상태를 설명하겠습니다.",
  "source_type": "user_edited",
  "updated_at": "2026-03-11T09:40:00Z"
}
```

### 11.5 Error DTO
```json
{
  "code": "UNSUPPORTED_FILE_TYPE",
  "message": "PDF 파일만 업로드할 수 있습니다.",
  "details": null
}
```

## 12. 구현 시 주의점
- `POST /boards/upload`는 DB insert와 파일 저장을 하나의 서비스 흐름으로 묶되, 실패 시 정리 전략을 명확히 해야 한다.
- `PUT /boards/{board_id}/segments`는 텍스트만 수정 가능하게 강제해야 한다.
- `GET /boards`는 latest job 조인 비용을 줄이기 위해 서브쿼리 또는 윈도우 함수 전략을 고려한다.
- `GET /files/{asset_id}`는 로컬 파일 경로를 외부 응답에 직접 노출하지 않아야 한다.
- retry 시 기존 세그먼트 재사용 여부는 후속 정책 결정이 필요하지만, MVP는 기존 세그먼트를 삭제 후 재생성하는 흐름이 단순하다.

## 13. 권장 구현 순서
1. SQLAlchemy 모델 확정
2. Pydantic DTO 정의
3. DB 세션/설정 코드 추가
4. Folder API 구현
5. Board 조회 API 구현
6. Upload 서비스 + Background 작업 구현
7. Segment 저장 API 구현
8. 파일 스트리밍 API 구현

## 14. 구현 현황 (2026-03-11)

### 14.1 완료된 기능
- [완료] SQLAlchemy 모델 확정
  - users, folders, boards, board_assets, processing_jobs, transcript_segments 구현
  - 문서 제약(유니크, 체크, 인덱스, enum) 반영
- [완료] Pydantic DTO 정의
  - 요청/응답 DTO 및 검증 규칙 구현
- [완료] DB 세션/설정 코드
  - 환경변수 기반 DB/업로드 설정
  - 엔진/세션 팩토리, 의존성 함수, 초기화 함수 구현
- [완료] Folder API
  - `POST /folders`, `GET /folders`
- [완료] Board 조회 API
  - `GET /boards`, `GET /boards/{board_id}`, `GET /boards/{board_id}/status`
- [완료] Upload + Background
  - `POST /boards/upload`
  - 로컬 스토리지 저장, 자산 메타데이터 저장, 상태 갱신 파이프라인(placeholder) 구현
- [완료] Segment 저장 API
  - `PUT /boards/{board_id}/segments`
  - 타임스탬프 불변 규칙 검증 및 `source_type=user_edited` 반영
- [완료] 파일 스트리밍 API
  - `GET /files/{asset_id}`
  - storage_key 직접 노출 없이 asset_id 기반 반환
- [완료] 보드 명령 API
  - `PATCH /boards/{board_id}`
  - `DELETE /boards/{board_id}`
  - `POST /boards/{board_id}/retry`

### 14.2 상태 정책 반영 요약
- Processing 계열(`queued`, `processing`, `postprocessing`) 상태에서는 보드 수정/세그먼트 수정 제한
- failed 상태에서만 retry 허용
- processing 행 액션 정책(삭제 허용) 및 실패 시 `재시도` 액션 정책 반영

### 14.3 테스트/안정성 현황
- 테스트 수: 30개
- 범위: 모델, DTO, 세션/설정, 폴더 API, 보드 조회 API, 업로드 API, 세그먼트 API, 파일 API, 보드 명령 API
- SQLite 커넥션 정리 안정화:
  - API 테스트 teardown에 `close_all_sessions()`, `engine.dispose()`, `gc.collect()` 적용
  - 테스트 엔진은 `NullPool` 사용
  - 경고 승격 모드(`PYTHONWARNINGS=error::ResourceWarning`)에서 `ResourceWarning` 0건 확인

## 15. 실행 및 검증 가이드

### 15.1 환경 변수
- `NOTESYNC_DATABASE_URL`
- `SQLALCHEMY_ECHO`
- `SQLALCHEMY_POOL_PRE_PING`
- `NOTESYNC_UPLOAD_ROOT`
- `NOTESYNC_MEDIA_MAX_BYTES`
- `NOTESYNC_PDF_MAX_BYTES`

예시는 `backend/.env.example`를 참고한다.

### 15.2 테스트 실행
백엔드 루트에서 실행:

```bash
PYTHONPATH=. python -m unittest discover -s tests -v
```

경고를 에러로 승격한 검증:

```bash
PYTHONWARNINGS=error::ResourceWarning PYTHONTRACEMALLOC=1 PYTHONPATH=. python -m unittest discover -s tests -v
```

## 16. 남은 후속 작업 (권장)
1. Upload 파이프라인의 placeholder 단계를 실제 PDF 추출/STT/후보정 서비스로 교체
2. `PATCH/DELETE/RETRY` 관련 프론트 연동 시나리오 테스트 추가
3. Alembic 도입 및 초기 마이그레이션 스크립트 생성
4. API 사용 예시 및 운영 가이드 문서 분리(`docs/backend-runbook.md` 등)