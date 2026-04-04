# app/services/file_service.py

from typing import Any, Dict, List, Tuple
import re


def filter_invalid_segments(
    segments: List[Dict],
    min_duration: float = 0.08,
    max_chars_per_second: float = 28.0,
    max_weird_char_ratio: float = 0.60,
    suspicious_weird_char_ratio: float = 0.35,
    no_speech_drop_threshold: float = 0.95,
    low_confidence_threshold: float = -1.2,
) -> Tuple[List[Dict], Dict[str, Any]]:
    """
    Whisper/Groq STT segment를 1차 필터링한다.

    목적:
    - 명백한 이상 segment 제거
    - 애매한 segment는 남기되 suspicious 플래그 부여

    반환:
    (
        valid_segments,
        {
            "input_count": int,
            "valid_count": int,
            "dropped_count": int,
            "suspicious_count": int,
            "dropped_segments": List[Dict],
        }
    )
    """

    def normalize_text(text: str) -> str:
        return " ".join(str(text).split()).strip()

    def safe_float(value: Any, default: float = 0.0) -> float:
        try:
            return float(value)
        except Exception:
            return default

    def count_weird_chars(text: str) -> int:
        """
        허용 문자 범위 밖의 문자 수를 센다.
        너무 엄격하면 수식/기호를 많이 버릴 수 있으므로,
        기본적인 한글/영문/숫자/공백/일반 구두점/자주 쓰는 수학 기호는 허용한다.
        """
        allowed_pattern = re.compile(
            r"[가-힣ㄱ-ㅎㅏ-ㅣ"
            r"A-Za-z"
            r"0-9"
            r"\s"
            r"\.\,\!\?\:\;\'\"\(\)\[\]\{\}"
            r"\-\_\+\=\*\/\\\|"
            r"\%\&\#\@\~\^"
            r"\<\>"
            r"·•…"
            r"“”‘’"
            r"℃°"
            r"×÷±"
            r"α-ωΑ-Ω"
            r"ㄴ-ㅎㅏ-ㅣ"
            r"]"
        )
        weird_count = 0
        for ch in text:
            if allowed_pattern.fullmatch(ch):
                continue
            weird_count += 1
        return weird_count

    def has_broken_repetition(text: str) -> bool:
        """
        깨진 인식에서 자주 보이는 과도한 반복 패턴 감지
        예: 'ㅋㅋㅋㅋㅋㅋㅋㅋ', '..........', 'aaaaaaa'
        """
        if re.search(r"(.)\1{6,}", text):
            return True
        if re.search(r"([^\w\s])\1{4,}", text):
            return True
        return False

    valid_segments: List[Dict] = []
    dropped_segments: List[Dict] = []

    for idx, seg in enumerate(segments):
        raw_text = seg.get("text", "")
        text = normalize_text(raw_text)

        start = safe_float(seg.get("start"))
        end = safe_float(seg.get("end"))
        duration = end - start

        avg_logprob = seg.get("avg_logprob")
        no_speech_prob = safe_float(seg.get("no_speech_prob"), default=-1.0)
        compression_ratio = seg.get("compression_ratio")

        drop_reasons: List[str] = []
        suspicious_reasons: List[str] = []

        # 1. 기본 무효값 제거
        if not text:
            drop_reasons.append("empty_text")

        if duration <= 0:
            drop_reasons.append("invalid_timestamp")

        if 0 < duration < min_duration:
            drop_reasons.append("too_short_duration")

        if drop_reasons:
            dropped_segments.append(
                {
                    "index": idx,
                    "start": start,
                    "end": end,
                    "text": text,
                    "drop_reasons": drop_reasons,
                }
            )
            continue

        text_len = len(text)
        chars_per_second = text_len / duration if duration > 0 else float("inf")
        weird_char_count = count_weird_chars(text)
        weird_char_ratio = weird_char_count / text_len if text_len > 0 else 0.0

        # 2. 하드 드롭 조건
        if no_speech_prob >= no_speech_drop_threshold and text_len <= 15:
            drop_reasons.append("high_no_speech_prob")

        if chars_per_second > max_chars_per_second:
            drop_reasons.append("too_many_chars_for_duration")

        if weird_char_ratio >= max_weird_char_ratio and text_len >= 4:
            drop_reasons.append("too_many_weird_chars")

        if has_broken_repetition(text):
            drop_reasons.append("broken_repetition")

        # 매우 짧은 시간에 긴 문자열
        if duration < 0.35 and text_len >= 20:
            drop_reasons.append("long_text_in_tiny_duration")

        # confidence가 매우 낮고 텍스트도 짧고 애매한 경우
        if avg_logprob is not None:
            try:
                if float(avg_logprob) <= low_confidence_threshold and text_len <= 3:
                    drop_reasons.append("very_low_confidence_short_text")
            except Exception:
                pass

        if drop_reasons:
            dropped_segments.append(
                {
                    "index": idx,
                    "start": start,
                    "end": end,
                    "text": text,
                    "drop_reasons": drop_reasons,
                }
            )
            continue

        # 3. 소프트 플래그 조건
        if weird_char_ratio >= suspicious_weird_char_ratio:
            suspicious_reasons.append("suspicious_weird_chars")

        if chars_per_second > 18:
            suspicious_reasons.append("high_chars_per_second")

        if avg_logprob is not None:
            try:
                if float(avg_logprob) <= -0.8:
                    suspicious_reasons.append("low_confidence")
            except Exception:
                pass

        if compression_ratio is not None:
            try:
                if float(compression_ratio) >= 2.4:
                    suspicious_reasons.append("high_compression_ratio")
            except Exception:
                pass

        cleaned_seg = dict(seg)
        cleaned_seg["text"] = text

        if suspicious_reasons:
            cleaned_seg["suspicious"] = True
            cleaned_seg["suspicious_reasons"] = suspicious_reasons
        else:
            cleaned_seg["suspicious"] = False
            cleaned_seg["suspicious_reasons"] = []

        valid_segments.append(cleaned_seg)

    report = {
        "input_count": len(segments),
        "valid_count": len(valid_segments),
        "dropped_count": len(dropped_segments),
        "suspicious_count": sum(1 for seg in valid_segments if seg.get("suspicious")),
        "dropped_segments": dropped_segments,
    }

    print(
        f"Segment 1차 필터 완료: "
        f"{report['input_count']}개 -> {report['valid_count']}개 유지, "
        f"{report['dropped_count']}개 제거, "
        f"{report['suspicious_count']}개 주의"
    )

    return valid_segments, report