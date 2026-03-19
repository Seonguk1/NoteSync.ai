# app/services/ai_pipeline/pdf_processor.py
import json
import time
from pathlib import Path
from importlib import import_module

from app.core.settings import Settings
from app.core.exceptions import PdfExtractionError, PipelineConfigurationError

class RealPdfProvider:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def extract_text(self, pdf_path: Path) -> str:
        try:
            PdfReader = getattr(import_module("pypdf"), "PdfReader")
        except Exception as exc:  # pragma: no cover
            raise PdfExtractionError("pypdf 의존성이 없어 PDF 텍스트 추출을 수행할 수 없습니다.") from exc

        try:
            reader = PdfReader(str(pdf_path))
            text_parts: list[str] = []
            for page in reader.pages:
                text_parts.append(page.extract_text() or "")
            text = "\n".join(text_parts).strip()
            if not text:
                raise PdfExtractionError("PDF 텍스트가 비어 있습니다.")
            return text
        except PdfExtractionError:
            raise
        except Exception as exc:  # pragma: no cover
            raise PdfExtractionError(f"PDF 텍스트 추출 실패: {exc}") from exc

    def extract_keywords(self, pdf_text: str, limit: int, board_title: str, board_subject: str = "") -> list[str]:
        api_key = self._settings.gemini_api_key.strip()
        if not api_key:
            raise PipelineConfigurationError("NOTESYNC_GEMINI_API_KEY가 설정되지 않았습니다.")

        try:
            genai = import_module("google.genai")
            from google.genai import types 
        except Exception as exc:  # pragma: no cover
            raise PipelineConfigurationError("google-genai 의존성이 없어 키워드 추출을 수행할 수 없습니다.") from exc

        system_instruction = (
            "당신은 대학교 전공 및 교양 강의 자료를 분석하여 핵심 개념을 도출하는 AI 조교입니다. "
            f"강의명은 '{board_title}'이며, 강의 주제는 '{board_subject or board_title}'입니다.\n"
            "[추출 규칙]\n"
            "1. '목차', '1주차', '학습목표', '페이지 번호' 등 단순한 구조적 요소는 제외하세요.\n"
            "2. 단, '서론', '참고문헌' 등이 해당 강의에서 학습해야 할 '핵심 이론'으로 다뤄지는 경우 반드시 포함하세요.\n"
            "3. 반드시 명사형 단어 형태(예: '운영체제', '페이지 폴트')로만 추출하세요.\n"
            f"4. 강의 주제와 가장 연관성이 높은 핵심 키워드 순서대로 최대 {limit}개까지만 추출하세요."
        )

        user_prompt = f"[강의 자료 텍스트]\n{pdf_text[:8000]}"

        try:
            client = genai.Client(api_key=api_key)
            response = None

            for attempt in range(3):
                try:
                    response = client.models.generate_content(
                        model=self._settings.gemini_model_name,
                        contents=user_prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=system_instruction,
                            temperature=0.2, 
                            response_mime_type="application/json",
                            response_schema={"type": "ARRAY", "items": {"type": "STRING"}}, 
                        )
                    )
                    break
                except Exception as e:
                    if ("429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)) and attempt < 2:
                        wait_time = 10 * (attempt + 1) 
                        print(f"⚠️ 키워드 추출: Gemini API 할당량 초과(429). {wait_time}초 대기 후 재시도... ({attempt + 1}/3)")
                        time.sleep(wait_time)
                        continue
                    raise e
                    
            raw = (response.text or "").strip()
            if not raw:
                raise PdfExtractionError("키워드 추출 결과가 비어 있습니다.")

            try:
                keywords = json.loads(raw)
            except json.JSONDecodeError:
                raise PdfExtractionError(f"키워드 JSON 파싱 실패: {raw}")

            if not isinstance(keywords, list) or not keywords:
                raise PdfExtractionError("키워드 목록이 올바른 배열 형태가 아니거나 비어있습니다.")
                
            print(f"✅ 추출된 키워드: {keywords}")
            return keywords[:limit]

        except (PdfExtractionError, PipelineConfigurationError):
            raise
        except Exception as exc:  # pragma: no cover
            raise PdfExtractionError(f"키워드 추출 실패: {exc}") from exc