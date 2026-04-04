import os
from typing import List, Dict

def normalize_timestamps(
    segments: List[Dict],
    words: List[Dict],
    min_chars: int = 12,
    max_chars: int = 150,
    min_duration: float = 2.0,
    max_duration: float = 30.0,
    max_gap: float = 2.0,
) -> List[Dict]:
    """
    STT 세그먼트를 자막 단위로 병합/재구성한다.

    원칙:
    - 기본은 segment 단위로 버퍼링
    - 버퍼가 max를 넘으면 flush
    - 단, 현재 버퍼가 너무 짧으면 다음 segment의 일부(word 단위)를 끌어와 채운 뒤 flush
    - segment 하나가 너무 길면 word 단위로 분할
    """

    def normalize_text(text: str) -> str:
        return " ".join(str(text).split()).strip()

    def create_empty_buffer() -> Dict:
        return {"start": None, "end": None, "text": "", "words": []}

    def is_buffer_empty(buffer: Dict) -> bool:
        return not buffer["text"]

    def make_text_with_buffer(buffer: Dict, piece: Dict) -> str:
        if is_buffer_empty(buffer):
            return normalize_text(piece["text"])
        return normalize_text(f"{buffer['text']} {piece['text']}")

    def get_gap(buffer: Dict, piece: Dict) -> float:
        if is_buffer_empty(buffer) or buffer["end"] is None:
            return 0.0
        return float(piece["start"]) - float(buffer["end"])

    def can_fit_segment(buffer: Dict, piece: Dict) -> bool:
        combined_text = make_text_with_buffer(buffer, piece)
        combined_duration = (
            float(piece["end"]) - float(buffer["start"])
            if not is_buffer_empty(buffer)
            else float(piece["end"]) - float(piece["start"])
        )

        if len(combined_text) > max_chars:
            return False
        if combined_duration > max_duration:
            return False
        if not is_buffer_empty(buffer) and get_gap(buffer, piece) > max_gap:
            return False
        return True

    def append_segment_to_buffer(buffer: Dict, piece: Dict) -> None:
        if is_buffer_empty(buffer):
            buffer["start"] = float(piece["start"])
            buffer["end"] = float(piece["end"])
            buffer["text"] = normalize_text(piece["text"])
            buffer["words"] = list(piece.get("words", []))
        else:
            buffer["end"] = float(piece["end"])
            buffer["text"] = normalize_text(f"{buffer['text']} {piece['text']}")
            buffer["words"].extend(piece.get("words", []))

    def flush_buffer(buffer: Dict, normalized: List[Dict]) -> Dict:
        if not is_buffer_empty(buffer):
            normalized.append(
                {
                    "start": round(float(buffer["start"]), 3),
                    "end": round(float(buffer["end"]), 3),
                    "text": normalize_text(buffer["text"]),
                }
            )
        return create_empty_buffer()

    def is_buffer_too_short(buffer: Dict) -> bool:
        if is_buffer_empty(buffer):
            return True

        duration = float(buffer["end"]) - float(buffer["start"])
        return len(buffer["text"]) < min_chars or duration < min_duration

    def is_segment_too_long(piece: Dict) -> bool:
        duration = float(piece["end"]) - float(piece["start"])
        return len(piece["text"]) > max_chars or duration > max_duration

    def build_piece_from_words(word_list: List[Dict]) -> Dict | None:
        if not word_list:
            return None

        text_parts = []
        normalized_words = []

        for w in word_list:
            word_text = normalize_text(w.get("word") or w.get("text") or "")
            if not word_text:
                continue

            normalized_words.append(
                {
                    "start": float(w["start"]),
                    "end": float(w["end"]),
                    "word": word_text,
                }
            )
            text_parts.append(word_text)

        if not normalized_words:
            return None

        return {
            "start": normalized_words[0]["start"],
            "end": normalized_words[-1]["end"],
            "text": normalize_text(" ".join(text_parts)),
            "words": normalized_words,
        }

    def take_words_to_fill_buffer(buffer: Dict, piece: Dict) -> tuple:
        piece_words = piece.get("words", [])
        if not piece_words:
            return None, piece

        def ends_with_sentence_punctuation(word_text: str) -> bool:
            if not word_text:
                return False
            return word_text[-1] in {".", "!", "?", "。", "！", "？"}

        def ends_with_soft_punctuation(word_text: str) -> bool:
            if not word_text:
                return False
            return word_text[-1] in {",", ";", ":", "，", "；", "："}

        last_fit_idx = -1
        last_sentence_punct_idx = -1
        last_soft_punct_idx = -1

        for idx, w in enumerate(piece_words):
            candidate_words = piece_words[: idx + 1]
            candidate_piece = build_piece_from_words(candidate_words)

            if candidate_piece is None:
                continue

            if can_fit_segment(buffer, candidate_piece):
                last_fit_idx = idx

                word_text = normalize_text(w.get("word") or w.get("text") or "")
                if ends_with_sentence_punctuation(word_text):
                    last_sentence_punct_idx = idx
                elif ends_with_soft_punctuation(word_text):
                    last_soft_punct_idx = idx
            else:
                break

        if last_fit_idx == -1:
            taken_words = [piece_words[0]]
        else:
            if last_sentence_punct_idx != -1:
                cut_idx = last_sentence_punct_idx
            elif last_soft_punct_idx != -1:
                cut_idx = last_soft_punct_idx
            else:
                cut_idx = last_fit_idx

            taken_words = piece_words[: cut_idx + 1]

        taken_piece = build_piece_from_words(taken_words)
        remaining_piece = build_piece_from_words(piece_words[len(taken_words):])

        return taken_piece, remaining_piece
    
    def attach_words_to_segments(segments: List[Dict], words: List[Dict]) -> List[Dict]:
        if not words:
            enriched = []
            for seg in segments:
                text = normalize_text(seg.get("text", ""))
                if not text:
                    continue
                enriched.append(
                    {
                        "start": float(seg["start"]),
                        "end": float(seg["end"]),
                        "text": text,
                        "words": [],
                    }
                )
            return enriched

        enriched = []
        word_idx = 0
        total_words = len(words)

        for seg in segments:
            seg_text = normalize_text(seg.get("text", ""))
            if not seg_text:
                continue

            seg_start = float(seg["start"])
            seg_end = float(seg["end"])
            seg_words = []

            while word_idx < total_words and float(words[word_idx]["end"]) <= seg_start:
                word_idx += 1

            scan_idx = word_idx
            while scan_idx < total_words and float(words[scan_idx]["start"]) < seg_end:
                raw_word = words[scan_idx]
                word_text = normalize_text(raw_word.get("word") or raw_word.get("text") or "")
                if word_text:
                    seg_words.append(
                        {
                            "start": float(raw_word["start"]),
                            "end": float(raw_word["end"]),
                            "word": word_text,
                        }
                    )
                scan_idx += 1

            word_idx = scan_idx

            enriched.append(
                {
                    "start": seg_start,
                    "end": seg_end,
                    "text": seg_text,
                    "words": seg_words,
                }
            )

        return enriched

    enriched_segments = attach_words_to_segments(segments, words)

    normalized = []
    buffer = create_empty_buffer()

    for seg in enriched_segments:
        current = seg

        while current is not None:
            if can_fit_segment(buffer, current):
                append_segment_to_buffer(buffer, current)
                current = None
                continue

            if not is_buffer_empty(buffer):
                current_gap = get_gap(buffer, current)

                # 버퍼가 너무 짧으면 다음 segment 일부를 끌어와 채운 뒤 flush
                if is_buffer_too_short(buffer) and current.get("words") and current_gap <= max_gap:
                    partial_piece, remaining_piece = take_words_to_fill_buffer(buffer, current)

                    if partial_piece:
                        append_segment_to_buffer(buffer, partial_piece)
                        buffer = flush_buffer(buffer, normalized)
                        current = remaining_piece
                    else:
                        buffer = flush_buffer(buffer, normalized)
                else:
                    buffer = flush_buffer(buffer, normalized)

            else:
                # 버퍼가 비어 있는데 segment 하나가 너무 길면 word 단위로 분할
                if is_segment_too_long(current) and current.get("words"):
                    partial_piece, remaining_piece = take_words_to_fill_buffer(buffer, current)

                    if partial_piece:
                        append_segment_to_buffer(buffer, partial_piece)
                        buffer = flush_buffer(buffer, normalized)
                        current = remaining_piece
                    else:
                        append_segment_to_buffer(buffer, current)
                        buffer = flush_buffer(buffer, normalized)
                        current = None
                else:
                    append_segment_to_buffer(buffer, current)
                    current = None

    if not is_buffer_empty(buffer):
        buffer = flush_buffer(buffer, normalized)

    print(f"📏 자막 보정 완료: {len(segments)}개 -> {len(normalized)}개로 최적화됨")
    return normalized