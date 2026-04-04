# backend/app/services/ai/__init__.py

# ai 서비스는 외부 LLM/모듈에 의존합니다. 로컬 개발환경에서 해당 패키지가
# 없을 경우 앱 전체가 임포트 실패로 멈추지 않도록 안전한 폴백(스텁)을 제공합니다.
try:
    from .keywords import extract_keywords_with_gemini, reduce_keywords_with_gemini
    from .stt import stt_with_groq
    from .refine import refine_script_with_gemini

    __all__ = [
        "extract_keywords_with_gemini",
        "reduce_keywords_with_gemini",
        "stt_with_groq",
        "refine_script_with_gemini",
    ]
except Exception:
    # 외부 의존성(예: google.genai, groq 등)이 없을 때 동작하는 비파괴적 스텁.
    async def extract_keywords_with_gemini(*, text: str, course_title: str = "", session_title: str = "", max_keywords: int = 50):
        return []

    async def reduce_keywords_with_gemini(*, words: list, course_title: str = "", session_title: str = "", max_keywords: int = 40):
        return words[:max_keywords]

    async def stt_with_groq(audio_path: str, context_keywords: list):
        return {"segments": [], "words": []}

    async def refine_script_with_gemini(*, segments: list, context_keywords: list, source_language: str = "ko", course_title: str = "", session_title: str = ""):
        # 입력 세그먼트를 그대로 반환(변환 없음)
        return segments

    __all__ = [
        "extract_keywords_with_gemini",
        "reduce_keywords_with_gemini",
        "stt_with_groq",
        "refine_script_with_gemini",
    ]