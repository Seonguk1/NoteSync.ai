# app/services/ai_pipeline/utils.py
import re

# 정규식 패턴: [MM:SS -> MM:SS] 형식 매칭
TIMESTAMP_PATTERN = re.compile(r"^\[\d{2}:\d{2} -> \d{2}:\d{2}\]\s+")

def _to_mmss(ms: int) -> str:
    """밀리초(ms)를 [MM:SS] 포맷으로 변환"""
    total_seconds = max(0, ms) // 1000
    minutes = total_seconds // 60
    seconds = total_seconds % 60
    return f"{minutes:02d}:{seconds:02d}"