# backend/app/services/ai/refine.py

import asyncio
import json
from typing import Dict, List

from google.genai import types
from pydantic import BaseModel, Field

from .clients import gemini_client, GEMINI_REFINE_MODEL

MAX_SEGMENTS_PER_CHUNK = 180
MAX_CHARS_PER_CHUNK = 12000
MAX_RETRIES = 3


class RefinedSubtitleSegment(BaseModel):
    start: float = Field(...)
    end: float = Field(...)
    text: str = Field(...)


def _chunk_segments(
    segments: List[Dict],
    max_segments: int = MAX_SEGMENTS_PER_CHUNK,
    max_chars: int = MAX_CHARS_PER_CHUNK,
) -> List[List[Dict]]:
    chunks: List[List[Dict]] = []
    current_chunk: List[Dict] = []
    current_chars = 0

    for seg in segments:
        seg_payload_chars = len(json.dumps(seg, ensure_ascii=False))

        should_split = (
            current_chunk
            and (
                len(current_chunk) >= max_segments
                or current_chars + seg_payload_chars > max_chars
            )
        )

        if should_split:
            chunks.append(current_chunk)
            current_chunk = []
            current_chars = 0

        current_chunk.append(seg)
        current_chars += seg_payload_chars

    if current_chunk:
        chunks.append(current_chunk)

    return chunks


def _is_transient_gemini_error(error: Exception) -> bool:
    message = str(error)
    transient_markers = [
        "503",
        "UNAVAILABLE",
        "500",
        "INTERNAL",
        "504",
        "DEADLINE_EXCEEDED",
    ]
    return any(marker in message for marker in transient_markers)


async def _refine_chunk_with_gemini(
    segments: List[Dict],
    context_keywords: List[str],
    source_language: str,
    course_title: str,
    session_title: str,
) -> List[Dict]:
    raw_script_json = json.dumps(segments, ensure_ascii=False)
    keywords_str = ", ".join(context_keywords) if context_keywords else "(none)"
    course_title = course_title.strip()
    session_title = session_title.strip()

    system_instruction = (
            "당신은 대학교 전공 강의 스크립트 교정 및 자막 생성 AI입니다. "
            f"강의명은 '{course_title}'이며, 강의 주제는 '{session_title}'입니다.\n\n"
            "[교정 규칙]\n"
            "1. **[핵심] 발음이 꼬인 동음이의어는 반드시 제공된 [전공 용어 사전]의 단어로 최우선 치환하세요.**\n"
            "2. 원래의 언어를 유지하고, 번역하지 마세요.\n"
            "3. '어...', '그...', '음...' 같은 무의미한 추임새는 제거하세요. 텍스트가 다 지워지면 빈 문자열(\"\")을 남기세요.\n"
            "4. 같은 단어가 5번 이상 반복될 경우 과도한 반복으로 판단하고 해당 단어는 1개만 남기세요. \n"
            "5. 문맥과 상관없는 외계어, 환각 구간 역시 빈 문자열(\"\")로 처리하세요.\n"
            "6. 수식은 복잡한 LaTeX 표기 대신 일반 텍스트(예: Y = a/b, x_i)로 표기하세요.\n"
            "7. 원본 STT의 문맥을 최대한 훼손하지 않고 오탈자만 교정하세요.\n"
            "8. 문장이 의미적으로 옳지 않다면 문맥에 맞게 자연스럽게 교정하세요. 단, 원본과 너무 다르게 바꾸지는 마세요."
            "예) 네트워크에서 디바이스들은 포스트라고 해요. -> 호스트라고 해요. \n"
            "9. **[형식 강제] 타임스탬프나 순번 기호는 일절 포함하지 말고, 오직 '교정된 텍스트'들만 배열에 담아 원본과 완벽히 동일한 개수로 반환하세요.**"
        ).strip()

    metadata_lines = [f"Source language: {source_language}"]
    if course_title:
        metadata_lines.append(f"Course title: {course_title}")
    if session_title:
        metadata_lines.append(f"Session title: {session_title}")

    metadata_block = "\n".join(metadata_lines)

    prompt = f"""
- Major Terminology Dictionary (Highest Priority):
{keywords_str}

- Lecture metadata:
{metadata_block}

- Subtitle segments JSON:
{raw_script_json}
""".strip()

    last_error: Exception | None = None

    for attempt in range(MAX_RETRIES):
        try:
            response = await gemini_client.models.generate_content(
                model=GEMINI_REFINE_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema=list[RefinedSubtitleSegment],
                    temperature=0.2,
                    thinking_config=types.ThinkingConfig(
                        thinking_budget=0
                    ),
                ),
            )

            parsed = json.loads(response.text)

            if len(parsed) != len(segments):
                raise ValueError(
                    f"Segment count mismatch: expected {len(segments)}, got {len(parsed)}"
                )

            refined_segments: List[Dict] = []

            for original, candidate in zip(segments, parsed):
                refined_text = str(candidate.get("text", "")).strip()

                refined_segments.append(
                    {
                        "start": original["start"],
                        "end": original["end"],
                        "text": refined_text or str(original.get("text", "")).strip(),
                    }
                )

            return refined_segments

        except Exception as e:
            last_error = e

            if attempt < MAX_RETRIES - 1 and _is_transient_gemini_error(e):
                await asyncio.sleep(1.5 * (2 ** attempt))
                continue

            raise

    raise last_error if last_error else RuntimeError("Unknown Gemini refine error")


async def refine_script_with_gemini(
    segments: List[Dict],
    context_keywords: List[str],
    source_language: str = "ko",
    course_title: str = "",
    session_title: str = "",
) -> List[Dict]:
    """
    Whisper가 만든 자막을 Gemini로 후보정한다.
    - 긴 스크립트는 chunk 단위로 나눠 처리
    - 실패한 chunk는 원본 유지
    - timestamps(start/end)는 그대로 유지
    - 강의명/세션명을 함께 제공해 문맥 정확도를 높인다
    """
    if not segments:
        return []

    print("🧠 Gemini: 자막 문맥 후보정 시작...")

    chunks = _chunk_segments(segments)
    refined_all: List[Dict] = []

    for index, chunk in enumerate(chunks, start=1):
        try:
            refined_chunk = await _refine_chunk_with_gemini(
                segments=chunk,
                context_keywords=context_keywords,
                source_language=source_language,
                course_title=course_title,
                session_title=session_title,
            )
            refined_all.extend(refined_chunk)
            print(f"✅ Gemini 자막 후보정 완료 ({index}/{len(chunks)} chunk)")
        except Exception as e:
            print(
                f"⚠️ 자막 후보정 실패 - chunk {index}/{len(chunks)} "
                f"(원본 자막으로 대체): {e}"
            )
            refined_all.extend(chunk)

    return refined_all