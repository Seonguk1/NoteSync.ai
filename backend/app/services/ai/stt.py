# backend/app/services/ai/stt.py

import os
from typing import Dict, List, Any

from .clients import groq_client, WHISPER_MODEL

async def stt_with_groq(
    audio_path: str,
    context_keywords: List[str] = [],
    language: str = "ko",
) -> Dict[str, Any]:
    """
    압축된 오디오 파일을 Groq Whisper API에 보내
    segment + word 타임스탬프가 포함된 STT 결과를 받아온다.

    반환 형식:
    {
        "text": str,
        "segments": List[Dict],
        "words": List[Dict],
    }
    """
    print(f"👂 Groq STT 시작: {audio_path}")

    initial_prompt = ", ".join(context_keywords) if context_keywords else ""

    def _to_plain_dict_list(items: Any) -> List[Dict]:
        if not items:
            return []

        result = []
        for item in items:
            if hasattr(item, "model_dump"):
                result.append(item.model_dump())
            elif isinstance(item, dict):
                result.append(item)
            else:
                result.append(dict(item))
        return result

    try:
        with open(audio_path, "rb") as file:
            transcription = await groq_client.audio.transcriptions.create(
                file=(os.path.basename(audio_path), file.read()),
                model=WHISPER_MODEL,
                prompt=initial_prompt,
                language=language,
                response_format="verbose_json",
                timestamp_granularities=["word", "segment"],
            )

        segments = _to_plain_dict_list(getattr(transcription, "segments", []))
        words = _to_plain_dict_list(getattr(transcription, "words", []))
        text = getattr(transcription, "text", "")

        print(
            f"✅ Groq STT 완료: segments={len(segments)}개, "
            f"words={len(words)}개"
        )

        return {
            "text": text,
            "segments": segments,
            "words": words,
        }

    except Exception as e:
        print(f"❌ Groq STT 실패: {e}")
        raise