# app/services/ai_pipeline/stt_processor.py
import subprocess
from pathlib import Path
from importlib import import_module
from typing import Callable

from app.core.settings import Settings
from app.core.exceptions import PipelineConfigurationError, SttProcessingError
from .schemas import TranscriptChunk
from .utils import _to_mmss

class RealSttProvider:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self.CHUNK_SECONDS = 1200  # 💡 20분 단위 분할

    def _prepare_audio_chunks(self, input_path: Path) -> list[tuple[Path, int]]:
        """1차 압축 후 24MB 초과 시 20분 단위로 쪼개어 리스트 반환"""
        compressed_path = input_path.with_suffix(".temp_compressed.mp3")
        
        print(f"⚠️ [STT] FFmpeg 오디오 최적화(32k Mono 압축) 시작...")
        subprocess.run([
            "ffmpeg", "-y", "-i", str(input_path),
            "-codec:a", "libmp3lame", "-b:a", "32k", "-ac", "1",
            str(compressed_path)
        ], check=True, capture_output=True)

        print(f"✅ FFmpeg 압축 완료: {compressed_path} (크기: {compressed_path.stat().st_size / (1024 * 1024):.2f} MB)")
        
        # 1. 압축만으로 24MB 이하라면 리스트에 담아서 바로 반환
        if compressed_path.stat().st_size <= 24 * 1024 * 1024:
            return [(compressed_path, 0)]

        # 2. 24MB를 초과한다면 분할 시작
        print(f"⚠️ [STT] 압축 후에도 24MB 초과. {self.CHUNK_SECONDS//60}분 단위 분할 시작...")
        chunk_pattern = str(input_path.parent / f"{input_path.stem}_chunk_%03d.mp3")
        
        subprocess.run([
            "ffmpeg", "-y", "-i", str(compressed_path),
            "-f", "segment", "-segment_time", str(self.CHUNK_SECONDS),
            "-c", "copy", chunk_pattern
        ], check=True, capture_output=True)

        chunks = sorted(input_path.parent.glob(f"{input_path.stem}_chunk_*.mp3"))
        result = []
        for i, path in enumerate(chunks):
            offset_ms = i * self.CHUNK_SECONDS * 1000
            result.append((path, offset_ms))
        
        compressed_path.unlink() 
        return result

    def transcribe(self, media_path: Path, prompt_keywords: list[str], on_progress: Callable[[int, str], None] | None = None) -> list[TranscriptChunk]:
        api_key = self._settings.groq_api_key.strip()
        if not api_key:
            raise PipelineConfigurationError("NOTESYNC_GROQ_API_KEY가 설정되지 않았습니다.")

        try:
            groq = import_module("groq")
        except Exception as exc:
            raise PipelineConfigurationError("groq 패키지가 설치되지 않았습니다.") from exc

        if on_progress: on_progress(40, "📝 오디오 최적화 및 분할 중...")
        
        audio_tasks = self._prepare_audio_chunks(media_path)
        
        client = groq.Groq(api_key=api_key)
        prompt = ", ".join(prompt_keywords) if prompt_keywords else ""
        
        all_chunks: list[TranscriptChunk] = []

        try:
            for i, (chunk_path, offset_ms) in enumerate(audio_tasks):
                if on_progress:
                    on_progress(60, f"🚀 Groq 클라우드 STT 처리 중... ({i+1}/{len(audio_tasks)})")
                    
                with open(chunk_path, "rb") as file:
                    transcription = client.audio.transcriptions.create(
                        file=(chunk_path.name, file.read()),
                        model=self._settings.stt_model_name,
                        prompt=prompt,
                        response_format="verbose_json",
                        language="ko",
                        timestamp_granularities=["word"] 
                    )

                if hasattr(transcription, "words") and transcription.words:
                    words = transcription.words
                elif isinstance(transcription, dict) and "words" in transcription:
                    words = transcription["words"]
                else:
                    print(f"⚠️ [STT] 청크 {i+1}에서 단어 단위 타임스탬프가 없습니다.")
                    continue

                current_words = []
                current_start_ms = -1
                
                max_chars = 60 
                min_chars = 15 

                for word_obj in words:
                    if isinstance(word_obj, dict):
                        word_raw = word_obj.get("word", "")
                        w_start = word_obj.get("start", 0.0)
                        w_end = word_obj.get("end", 0.0)
                    else:
                        word_raw = getattr(word_obj, "word", "")
                        w_start = getattr(word_obj, "start", 0.0)
                        w_end = getattr(word_obj, "end", 0.0)
                        
                    word_text = str(word_raw).strip()
                    if not word_text:
                        continue

                    start_ms = int(float(w_start) * 1000) + offset_ms
                    end_ms = int(float(w_end) * 1000) + offset_ms

                    if current_start_ms == -1:
                        current_start_ms = start_ms

                    current_words.append(word_text)
                    current_line = " ".join(current_words) 

                    is_punctuation = word_text.endswith(('.', '?', '!'))
                    is_too_long = len(current_line) >= max_chars
                    is_long_enough = len(current_line) >= min_chars

                    if is_too_long or (is_punctuation and is_long_enough):
                        formatted_text = f"[{_to_mmss(current_start_ms)} -> {_to_mmss(end_ms)}] {current_line}"
                        
                        all_chunks.append(TranscriptChunk(
                            seq=len(all_chunks) + 1,
                            start_ms=current_start_ms,
                            end_ms=end_ms,
                            text=formatted_text
                        ))
                        
                        current_words = []
                        current_start_ms = -1

                if current_words:
                    last_line = " ".join(current_words)
                    if isinstance(words[-1], dict):
                        last_w_end = words[-1].get("end", 0.0)
                    else:
                        last_w_end = getattr(words[-1], "end", 0.0)
                        
                    last_end_ms = int(float(last_w_end) * 1000) + offset_ms
                    
                    all_chunks.append(TranscriptChunk(
                        seq=len(all_chunks) + 1,
                        start_ms=current_start_ms,
                        end_ms=last_end_ms,
                        text=f"[{_to_mmss(current_start_ms)} -> {_to_mmss(last_end_ms)}] {last_line}"
                    ))

            if not all_chunks:
                raise SttProcessingError("STT 결과 세그먼트가 없습니다.")

            return all_chunks

        except Exception as exc:
            raise SttProcessingError(f"Groq API 호출 실패: {exc}") from exc
        finally:
            if 'audio_tasks' in locals():
                for path, _ in audio_tasks:
                    if path.exists():
                        path.unlink()