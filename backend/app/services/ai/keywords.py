# backend/app/services/ai/keywords.py

import json
from typing import List

from google.genai import types
from pydantic import BaseModel

from .clients import gemini_client, GEMINI_KEYWORD_MODEL


class KeywordList(BaseModel):
    keywords: List[str]


async def extract_keywords_with_gemini(
    text: str,
    course_title: str = "",
    session_title: str = "",
    max_keywords: int = 50,
) -> List[str]:
    """
    PDF에서 추출한 텍스트를 읽고 핵심 전공 키워드를 뽑는다.
    강의명/세션명을 함께 제공해 문맥 정확도를 높인다.
    """
    print("🧠 Gemini: 핵심 키워드 추출 시작...")

    course_title = course_title.strip()
    session_title = session_title.strip()

    system_instruction = f"""
You are an expert academic assistant.

Task:
- Extract the most important academic/domain-specific keywords from the lecture text.
- Prioritize technical terminology, proper nouns, abbreviations, named concepts, protocols, algorithms, architectures, and framework names.
- Use the lecture metadata as context, but do not simply echo the lecture title.

Hard rules:
1. Return at most {max_keywords} keywords.
2. Return keywords only, no explanation.
3. Keep the original language when appropriate.
4. Prefer concise keyword forms.
5. Avoid overly generic words unless they are central to the lecture.
""".strip()

    metadata_lines = []
    if course_title:
        metadata_lines.append(f"Course title: {course_title}")
    if session_title:
        metadata_lines.append(f"Session title: {session_title}")

    metadata_block = "\n".join(metadata_lines) if metadata_lines else "No lecture metadata provided."

    prompt = f"""
Lecture metadata:
{metadata_block}

Lecture text:
{text[:30000]}
""".strip()

    try:
        response = await gemini_client.models.generate_content(
            model=GEMINI_KEYWORD_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.1,
                response_mime_type="application/json",
                response_schema=KeywordList,
                thinking_config=types.ThinkingConfig(
                    thinking_budget=0
                ),
            ),
        )

        parsed = json.loads(response.text)
        keywords = parsed.get("keywords", []) if isinstance(parsed, dict) else []
        keywords = [str(word).strip() for word in keywords if str(word).strip()]

        print(f"✅ Gemini 키워드 추출 완료: {len(keywords)}개 추출됨")
        print(f"📌 추출된 키워드: {keywords}")
        return keywords[:max_keywords]

    except Exception as e:
        print(f"❌ Gemini 키워드 추출 실패: {e}")
        return []


async def reduce_keywords_with_gemini(
    words: List[str],
    course_title: str = "",
    session_title: str = "",
    max_keywords: int = 50,
) -> List[str]:
    """
    제한 개수를 초과한 키워드 목록을 받아 더 중요한 키워드 중심으로 압축한다.
    강의명/세션명을 함께 제공해 문맥 정확도를 높인다.
    """
    print(f"🧠 Gemini: 키워드 압축 시작 ({len(words)}개 -> {max_keywords}개)")

    words_str = ", ".join(words)
    course_title = course_title.strip()
    session_title = session_title.strip()

    system_instruction = f"""
You are an expert academic assistant.

Task:
- Consolidate the keyword list to a maximum of {max_keywords} most critical keywords.
- Merge duplicates, near-duplicates, and synonyms when appropriate.
- Preserve important domain-specific terminology, proper nouns, abbreviations, and core concepts.
- Use lecture metadata only as context for deciding which keywords matter most.

Hard rules:
1. Return keywords only.
2. Return at most {max_keywords} keywords.
3. Do not explain your choices.
4. Keep the original language when appropriate.
""".strip()

    metadata_lines = []
    if course_title:
        metadata_lines.append(f"Course title: {course_title}")
    if session_title:
        metadata_lines.append(f"Session title: {session_title}")

    metadata_block = "\n".join(metadata_lines) if metadata_lines else "No lecture metadata provided."

    prompt = f"""
Lecture metadata:
{metadata_block}

Original keywords:
[{words_str}]
""".strip()

    try:
        response = await gemini_client.models.generate_content(
            model=GEMINI_KEYWORD_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.1,
                response_mime_type="application/json",
                response_schema=KeywordList,
                thinking_config=types.ThinkingConfig(
                    thinking_budget=0
                ),
            ),
        )

        parsed = json.loads(response.text)
        reduced_keywords = parsed.get("keywords", []) if isinstance(parsed, dict) else []
        reduced_keywords = [str(word).strip() for word in reduced_keywords if str(word).strip()]

        print(f"✅ Gemini 키워드 압축 완료: {len(reduced_keywords)}개로 최적화됨")
        return reduced_keywords[:max_keywords]

    except Exception as e:
        print(f"❌ Gemini 키워드 압축 실패: {e}")
        return words[:max_keywords]