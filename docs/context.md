# Project Overview: AI-Powered Lecture Transcription & Sync Platform (Local-First, Web-Ready MVP)

## 1. Tech Stack
- **Frontend:** React, Vite, TypeScript, Tailwind CSS
- **Backend:** Python, FastAPI
- **Database:** SQLite (SQLAlchemy ORM 사용, 향후 PostgreSQL 전환 고려)
- **AI/ML:** faster-whisper (로컬 STT), Google GenAI SDK (Gemini 2.5 Flash API - 후보정 및 키워드 추출)

## 2. Core Architecture Rules
- **Web-Ready Design:** 현재는 로컬에서 단일 사용자 모드로 동작하지만, 향후 다중 사용자 웹 서비스 배포를 전제로 설계한다.
    - Database 스키마 작성 시 반드시 `users` 테이블을 고려하고, 핵심 자원(Folders, Boards)은 `user_id`를 Foreign Key로 가져야 한다. (MVP 단계에서는 Default Auth Middleware에서 `user_id=1`로 하드코딩하여 넘김)
- **Storage Abstraction:** 파일 업로드 및 저장은 로컬 디스크(`/.uploads`)를 사용하되, 향후 S3 등으로 쉽게 교체할 수 있도록 Storage Interface/Service Layer를 분리하여 구현한다.

## 3. Key Workflows & Business Logic
- **Context-Aware STT Pipeline:** 1. 사용자가 미디어(Video/Audio)와 시각 자료(PDF)를 업로드.
    2. 백엔드에서 PDF 텍스트를 파싱하여 Gemini API로 핵심 전공 키워드 50개 추출.
    3. Whisper STT 모델의 `initial_prompt`에 해당 키워드를 주입하여 정확도를 높인 초안 스크립트 생성 (타임스탬프 포함).
    4. 추출된 스크립트를 원본 PDF 텍스트와 함께 Gemini API에 넘겨 오탈자 및 문맥 후보정. 
    **[중요 제약사항]** Gemini 후보정 프롬프트에는 "기존 STT의 타임스탬프 형식([00:00 -> 00:05] 등)을 절대 훼손하거나 수정하지 마라"는 규칙을 엄격하게 적용한다.

## 4. Frontend - Backend Communication
- **Background Processing:** 무거운 AI 파이프라인 처리는 업로드 API 응답을 블로킹하지 않도록 FastAPI의 `BackgroundTasks` (또는 로컬 큐)를 사용하여 비동기로 실행한다.
- **Progress Sync:** 프론트엔드 대시보드는 진행 중인 추출 작업(Processing)의 상태를 업데이트하기 위해, 3초 주기의 HTTP GET Polling 방식으로 `GET /boards/{id}/status` API를 호출한다. WebSockets나 SSE는 초기 MVP에서 제외한다.