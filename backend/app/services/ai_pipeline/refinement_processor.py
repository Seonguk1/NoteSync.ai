# app/services/ai_pipeline/refinement_processor.py
import time
import json
from importlib import import_module

from app.core.settings import Settings
from app.core.exceptions import PipelineConfigurationError, PostprocessRefinementError
from .schemas import TranscriptChunk
from .utils import _to_mmss

class RealRefinementProvider:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def refine(self, pdf_text: str, draft_chunks: list[TranscriptChunk], board_title: str, board_subject: str = "", keywords: list[str] = None) -> list[TranscriptChunk]:
        api_key = self._settings.gemini_api_key.strip()
        if not api_key:
            raise PipelineConfigurationError("NOTESYNC_GEMINI_API_KEY가 설정되지 않았습니다.")

        try:
            genai = import_module("google.genai")
            from google.genai import types 
        except Exception as exc:  # pragma: no cover
            raise PipelineConfigurationError("google-genai 의존성이 없어 AI 교정을 수행할 수 없습니다.") from exc

        keyword_str = ", ".join(keywords) if keywords else "없음"
        
        try:
            client = genai.Client(api_key=api_key)
        except Exception as exc: # pragma: no cover
            raise PipelineConfigurationError("Gemini 클라이언트 초기화에 실패했습니다.") from exc

        batch_size = 50
        batches = [draft_chunks[i:i + batch_size] for i in range(0, len(draft_chunks), batch_size)]
        final_refined_chunks: list[TranscriptChunk] = []

        system_instruction = (
            "당신은 대학교 전공 강의 스크립트 교정 및 자막 생성 AI입니다. "
            f"강의명은 '{board_title}'이며, 강의 주제는 '{board_subject or board_title}'입니다.\n\n"
            "[교정 규칙]\n"
            "1. **[핵심] 발음이 꼬인 동음이의어는 반드시 제공된 [전공 용어 사전]의 단어로 최우선 치환하세요.**\n"
            "2. '어...', '그...', '음...' 같은 무의미한 추임새는 제거하세요. 텍스트가 다 지워지면 빈 문자열(\"\")을 남기세요.\n"
            "3. 문맥과 상관없는 외계어, 환각 구간 역시 빈 문자열(\"\")로 처리하세요.\n"
            "4. 수식은 복잡한 LaTeX 표기 대신 일반 텍스트(예: Y = a/b, x_i)로 표기하세요.\n"
            "5. 원본 STT의 문맥을 최대한 훼손하지 않고 오탈자만 교정하세요.\n"
            "6. **[형식 강제] 타임스탬프나 순번 기호는 일절 포함하지 말고, 오직 '교정된 텍스트'들만 배열에 담아 원본과 완벽히 동일한 개수로 반환하세요.**"
        )

        for batch_index, batch in enumerate(batches):
            print(f"\n🚀 AI 교정 청크 처리 중: {batch_index + 1}/{len(batches)} (크기: {len(batch)}줄)")
            
            lines_for_prompt = []
            for idx, chunk in enumerate(batch):
                clean_text = chunk.text.split("] ", 1)[-1] if "] " in chunk.text else chunk.text
                lines_for_prompt.append(f"[{idx + 1}] {clean_text}")
                
            prompt = (
                "[전공 용어 사전 (최우선 반영)]\n"
                f"{keyword_str}\n\n"
                "[PDF 강의 자료 문맥 (참고용 배경 지식)]\n"
                f"{pdf_text[:4000]}\n\n"
                "[STT 구간 원본 (이 내용을 교정하여 정확히 동일한 길이의 배열로 반환하세요)]\n"
                f"{chr(10).join(lines_for_prompt)}"
            )

            max_retries = 3
            batch_success = False

            for attempt in range(max_retries):
                try:
                    response = client.models.generate_content(
                        model=self._settings.gemini_model_name,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=system_instruction,
                            temperature=0.1,
                            response_mime_type="application/json",
                            response_schema={"type": "ARRAY", "items": {"type": "STRING"}},
                        )
                    )
                    
                    raw = (response.text or "").strip()
                    if not raw:
                        raise ValueError("응답이 비어있음")

                    try:
                        refined_texts = json.loads(raw)
                    except json.JSONDecodeError:
                        raise ValueError(f"JSON 파싱 실패: {raw[:100]}...")

                    if not isinstance(refined_texts, list):
                        raise ValueError("응답이 배열(List) 형태가 아닙니다.")

                    if len(refined_texts) != len(batch):
                        raise ValueError(f"세그먼 개수 불일치. 원본: {len(batch)} / 응답: {len(refined_texts)}")

                    for idx, draft in enumerate(batch):
                        cleaned_text = str(refined_texts[idx]).strip()
                        perfect_text = f"[{_to_mmss(draft.start_ms)} -> {_to_mmss(draft.end_ms)}] {cleaned_text}"
                        
                        final_refined_chunks.append(
                            TranscriptChunk(
                                seq=draft.seq,
                                start_ms=draft.start_ms,
                                end_ms=draft.end_ms,
                                text=perfect_text,
                            )
                        )
                    
                    batch_success = True
                    break

                except Exception as e:
                    print(f"⚠️ 청크 {batch_index + 1} 생성 실패 ({attempt + 1}/{max_retries}): {e}")
                    if ("429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)) and attempt < max_retries - 1:
                        wait_time = 10 * (attempt + 1)
                        print(f"⏳ 할당량 초과(429)로 {wait_time}초 대기합니다...")
                        time.sleep(wait_time)

            if not batch_success:
                print(f"🚨 청크 {batch_index + 1} 최종 실패! 100% 안전성을 위해 이 구간만 원본 텍스트로 폴백합니다.")
                final_refined_chunks.extend(batch)

        print(f"✅ 후보정 전체 완료! 총 {len(final_refined_chunks)}개 세그먼트 생성 (입력: {len(draft_chunks)}개)")
        if len(final_refined_chunks) != len(draft_chunks):
            raise PostprocessRefinementError(f"전체 세그먼트 개수가 다릅니다! 원본: {len(draft_chunks)}, 결과: {len(final_refined_chunks)}")

        return final_refined_chunks