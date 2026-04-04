# backend/app/orchestrator.py

import asyncio
import os
import traceback

from sqlmodel import Session as DBSession, select

from app.database import engine
from app.models import Material, Transcript, Keyword
from app.services import ai as ai_service
from app.services.media import pdf_service, audio_service
from app.services.subtitle import filter_service, normalize_service


class UploadOrchestrator:
    def __init__(self):
        self.queue = asyncio.Queue()

    async def enqueue_material(self, material_id: int):
        await self.queue.put(material_id)
        print(f"📥 Material {material_id} 큐에 추가됨. (현재 대기: {self.queue.qsize()}개)")

    async def worker(self):
        print("⚙️ Background Worker가 시작되었습니다.")
        while True:
            material_id = await self.queue.get()

            with DBSession(engine) as db:
                material = db.get(Material, material_id)
                if not material:
                    self.queue.task_done()
                    continue

                print(f"🔄 처리 시작: [{material.type}] {material.original_name}")

                try:
                    absolute_path = None
                    if material.relative_path:
                        absolute_path = os.path.join("data", material.relative_path)

                    session = material.session
                    course = session.course if session else None

                    course_title = course.name if course else ""
                    session_title = session.name if session else ""

                    material.status = "PROCESSING"
                    db.add(material)
                    db.commit()

                    # ---------------------------------------------------------
                    # 📄 파이프라인 1: PDF 문서 처리
                    # ---------------------------------------------------------
                    if material.type == "pdf":
                        if not absolute_path:
                            raise ValueError("PDF 파일 경로가 없습니다.")

                        # 1. 텍스트 추출
                        text = pdf_service.extract_pdf_text(absolute_path)

                        # 2. 이번 PDF에서 새 키워드 추출
                        new_extracted_words = await ai_service.extract_keywords_with_gemini(
                            text=text,
                            course_title=course_title,
                            session_title=session_title,
                            max_keywords=50,
                        )

                        # 3. DB에서 현재 세션의 기존 키워드 가져오기
                        existing_keywords_db = db.exec(
                            select(Keyword).where(Keyword.session_id == material.session_id)
                        ).all()
                        existing_words = [k.word for k in existing_keywords_db]

                        # 4. 병합 및 중복 제거
                        combined_words = list(dict.fromkeys(existing_words + new_extracted_words))

                        # 5. 최대 개수 제한 확인 및 압축
                        MAX_KEYWORDS = 40
                        if len(combined_words) > MAX_KEYWORDS:
                            final_words = await ai_service.reduce_keywords_with_gemini(
                                words=combined_words,
                                course_title=course_title,
                                session_title=session_title,
                                max_keywords=MAX_KEYWORDS,
                            )
                        else:
                            final_words = combined_words[:MAX_KEYWORDS]

                        # 6. DB 업데이트
                        for keyword in existing_keywords_db:
                            db.delete(keyword)

                        for word in final_words:
                            db.add(Keyword(word=word, session_id=material.session_id))

                    # ---------------------------------------------------------
                    # 🎬 파이프라인 2: 오디오/비디오 미디어 처리
                    # ---------------------------------------------------------
                    elif material.type in ["audio", "video"]:
                        if not absolute_path:
                            raise ValueError("미디어 파일 경로가 없습니다.")

                        # 0. 세션 키워드 불러오기 (Whisper 힌트용)
                        existing_keywords_db = db.exec(
                            select(Keyword).where(Keyword.session_id == material.session_id)
                        ).all()
                        context_keywords = [k.word for k in existing_keywords_db]

                        # 1. 오디오 추출 및 압축
                        audio_path = audio_service.ensure_audio(absolute_path)
                        
                        # 2. Groq Whisper로 STT + 타임스탬프 추출
                        stt_result = await ai_service.stt_with_groq(audio_path, context_keywords)

                        raw_segments = stt_result["segments"]
                        raw_words = stt_result["words"]

                        # 3. Segments 필터링
                        filtered_segments, filter_report = filter_service.filter_invalid_segments(raw_segments)

                        # 4. 타임스탬프 길이 보정
                        normalized_segments = normalize_service.normalize_timestamps(
                            segments=filtered_segments,
                            words=raw_words,
                        )
                        
                        # 5. Gemini로 스크립트 후보
                        final_segments = await ai_service.refine_script_with_gemini(
                            segments=normalized_segments,
                            context_keywords=context_keywords,
                            source_language="ko",
                            course_title=course_title,
                            session_title=session_title,
                        )

                        # 6. 기존 자막 삭제 후 새로 저장
                        existing_transcripts = db.exec(
                            select(Transcript).where(Transcript.material_id == material.id)
                        ).all()

                        for transcript in existing_transcripts:
                            db.delete(transcript)

                        for seg in final_segments:
                            db.add(
                                Transcript(
                                    material_id=material.id,
                                    start_time=seg.get("start", 0.0),
                                    end_time=seg.get("end", 0.0),
                                    content=seg.get("text", ""),
                                    is_edited=False,
                                )
                            )

                    # ---------------------------------------------------------
                    # 📝 파이프라인 3: 노트 처리
                    # ---------------------------------------------------------
                    elif material.type == "note":
                        # 노트는 별도 AI 파이프라인 없음
                        pass

                    material.status = "COMPLETED"
                    db.add(material)
                    db.commit()
                    print(f"✅ 처리 완료: [{material.type}] {material.original_name}")

                    # 배치 처리 로직: 만약 이 자료가 PDF이고 batch_id가 있으면,
                    # 같은 batch의 모든 PDF가 완료되었는지 검사하고, 완료되었다면 BLOCKED 상태의 자료들을 READY로 전환하여 큐에 등록합니다.
                    try:
                        batch_id = getattr(material, "batch_id", None)
                        if batch_id and material.type == "pdf":
                            remaining_pdfs = db.exec(
                                select(Material).where(
                                    Material.batch_id == batch_id,
                                    Material.type == "pdf",
                                    Material.status != "COMPLETED",
                                )
                            ).all()

                            if not remaining_pdfs:
                                blocked_items = db.exec(
                                    select(Material).where(
                                        Material.batch_id == batch_id,
                                        Material.status == "BLOCKED",
                                    )
                                ).all()

                                if blocked_items:
                                    for b in blocked_items:
                                        b.status = "READY"
                                        db.add(b)
                                    db.commit()

                                    for b in blocked_items:
                                        await self.enqueue_material(b.id)
                    except Exception:
                        # 배치 해제 중 에러가 생겨도 전체 워커 실패로 이어지지 않도록 로깅만 수행
                        traceback.print_exc()

                except Exception:
                    material.status = "FAILED"
                    db.add(material)
                    db.commit()
                    print(f"❌ 처리 실패: [{material.type}] {material.original_name}")
                    traceback.print_exc()

                finally:
                    self.queue.task_done()


orchestrator = UploadOrchestrator()