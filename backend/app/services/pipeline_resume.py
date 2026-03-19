# 표준 및 타입 임포트
from functools import wraps
from typing import Optional
# 파이프라인 단계별 공통 예외처리 데코레이터
def pipeline_step(func):
    @wraps(func)
    def wrapper(job: ProcessingJob, db: Session):
        try:
            return func(job, db)
        except Exception as e:
            job.error_message = f"{func.__name__} 실패: {str(e)}"
            raise
    return wrapper
from sqlalchemy.orm import Session
from app.db.enums import AssetType, BoardStatus
from app.db.models import ProcessingJob, PipelineStage, JobStatus, BoardAsset, Board
from app.core.settings import get_settings
from app.services.ai_pipeline import get_stt_provider, get_refinement_provider
import os
import json
import pymupdf
import time
# 예시용 임포트 (실제 서비스에서는 적절한 라이브러리/모듈로 교체)
# import openai
# import whisper

@pipeline_step
def run_pdf_extraction(job: ProcessingJob, db: Session) -> None:
    """
    PDF 텍스트/스타일 추출 단계. PDF 파일 경로 조회 및 임시 JSON 저장.
    """
    PDF_DATA_PATH_FMT = "/tmp/pdfdata_{board_id}.json"
    print(f"📄 [Board {job.board_id}] PDF 텍스트 및 스타일 추출 시작...")
    start_ts = time.time()
    pdf_asset = db.query(BoardAsset).filter_by(
        board_id=job.board_id,
        asset_type=AssetType.PDF
    ).first()
    if not pdf_asset:
        raise FileNotFoundError("DB에 연결된 PDF 에셋이 없습니다.")
    from app.services.storage_service import storage_service
    pdf_path = storage_service.resolve_path(pdf_asset.storage_key)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF 파일이 존재하지 않습니다: {pdf_path}")
    # 실제 PDF 파싱: PyMuPDF 사용
    import fitz  # pymupdf
    pdf_data = []
    try:
        doc = fitz.open(pdf_path)
        for page_num in range(len(doc)):
            page = doc[page_num]
            text_blocks = []
            for block in page.get_text("dict")["blocks"]:
                if block["type"] == 0:  # 텍스트 블록
                    for line in block["lines"]:
                        for span in line["spans"]:
                            text_blocks.append({
                                "text": span["text"],
                                "style": span.get("font", ""),
                                "size": span.get("size", 0)
                            })
            pdf_data.append({
                "page": page_num + 1,
                "texts": text_blocks
            })
    except Exception as e:
        raise FileNotFoundError(f"PDF 파싱 실패: {e}")

    output_path = PDF_DATA_PATH_FMT.format(board_id=job.board_id)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(pdf_data, f, ensure_ascii=False, indent=2)
    job.draft_data_path = output_path
    job.error_message = None
    duration = time.time() - start_ts
    print(f"✅ PDF 추출 완료! 데이터가 저장되었습니다: {output_path} (소요: {duration:.3f}s)")

@pipeline_step
def run_keyword_extraction(job: ProcessingJob, db: Session) -> None:
    """
    PDF 텍스트 기반 키워드 추출 단계. draft_data_path에서 PDF 데이터 로드.
    """
    KEYWORD_PATH_FMT = "/tmp/keywords_{board_id}.json"
    print("🔑 키워드 추출 실행")
    start_ts = time.time()
    if not job.draft_data_path or not os.path.exists(job.draft_data_path):
        raise FileNotFoundError("PDF 추출 결과 파일이 존재하지 않습니다.")
    with open(job.draft_data_path, 'r', encoding='utf-8') as f:
        pdf_data = json.load(f)
    all_text = ' '.join(
        span['text']
        for page in pdf_data
        for span in page['texts']
    )
    from collections import Counter
    words = [w for w in all_text.split() if len(w) > 1]
    top_keywords = [w for w, _ in Counter(words).most_common(10)]
    keyword_path = KEYWORD_PATH_FMT.format(board_id=job.board_id)
    with open(keyword_path, 'w', encoding='utf-8') as f:
        json.dump({"keywords": top_keywords}, f, ensure_ascii=False, indent=2)
    job.draft_data_path = keyword_path
    job.error_message = None
    duration = time.time() - start_ts
    print(f"✅ 키워드 추출 완료: {top_keywords} (소요: {duration:.3f}s)")

@pipeline_step
def run_whisper_stt(job: ProcessingJob, db: Session, stt_provider=None) -> None:
    """
    Whisper 기반 STT(음성→텍스트) 단계. BoardAsset에서 미디어 파일 경로 조회.
    """
    STT_PATH_FMT = "/tmp/stt_{board_id}.json"
    print("🗣️ Whisper STT 실행")
    start_ts = time.time()
    audio_asset = db.query(BoardAsset).filter_by(
        board_id=job.board_id,
        asset_type=AssetType.MEDIA
    ).first()
    if not audio_asset:
        raise FileNotFoundError("DB에 연결된 음성/영상 에셋이 없습니다.")
    from app.services.storage_service import storage_service
    audio_path = storage_service.resolve_path(audio_asset.storage_key)
    print(f"[LOG] Whisper STT - resolved audio path: {audio_path}")
    if not audio_path.exists():
        raise FileNotFoundError(f"음성/영상 파일이 존재하지 않습니다: {audio_path}")
    # 실제/Mock Provider 분기
    if stt_provider is None:
        settings = get_settings()
        stt_provider = get_stt_provider(settings, settings.ai_pipeline_mode)
    # 키워드 프롬프트는 생략(실제 연동시 필요)
    stt_chunks = stt_provider.transcribe(media_path=audio_path, prompt_keywords=[], on_progress=None)
    # 예시: 첫 번째 청크만 텍스트로 저장
    stt_result = stt_chunks[0].text if stt_chunks else ""
    stt_path = STT_PATH_FMT.format(board_id=job.board_id)
    with open(stt_path, 'w', encoding='utf-8') as f:
        json.dump({"transcript": stt_result}, f, ensure_ascii=False, indent=2)
    job.draft_data_path = stt_path
    job.error_message = None
    duration = time.time() - start_ts
    print(f"✅ Whisper STT 완료: {stt_path} (소요: {duration:.3f}s)")

@pipeline_step
def run_ai_refinement(job: ProcessingJob, db: Session, refinement_provider=None) -> None:
    """
    AI 후보정(스크립트 LLM 보정) 단계. STT 결과 기반 LLM 후보정.
    """
    REFINED_PATH_FMT = "/tmp/refined_{board_id}.json"
    print("🤖 AI 후보정 실행")
    start_ts = time.time()
    if not job.draft_data_path or not os.path.exists(job.draft_data_path):
        raise FileNotFoundError("STT 결과 파일이 존재하지 않습니다.")
    with open(job.draft_data_path, 'r', encoding='utf-8') as f:
        stt_data = json.load(f)
    transcript = stt_data.get("transcript", "")
    # 실제/Mock Provider 분기
    if refinement_provider is None:
        settings = get_settings()
        refinement_provider = get_refinement_provider(settings, settings.ai_pipeline_mode)
    # 예시: transcript를 청크로 변환 후 후보정
    from app.services.ai_pipeline import TranscriptChunk
    draft_chunks = [TranscriptChunk(seq=1, start_ms=0, end_ms=10000, text=transcript)]
    refined_chunks = refinement_provider.refine(pdf_text="", draft_chunks=draft_chunks, board_title="", board_subject="", keywords=None)
    refined_result = refined_chunks[0].text if refined_chunks else ""
    refined_path = REFINED_PATH_FMT.format(board_id=job.board_id)
    with open(refined_path, 'w', encoding='utf-8') as f:
        json.dump({"refined": refined_result}, f, ensure_ascii=False, indent=2)
    job.draft_data_path = refined_path
    job.error_message = None
    duration = time.time() - start_ts
    print(f"✅ AI 후보정 완료: {refined_path} (소요: {duration:.3f}s)")

def resume_pipeline(board_id: int, db: Session):
    job = db.query(ProcessingJob).filter_by(board_id=board_id).order_by(ProcessingJob.created_at.desc()).first()
    if not job or job.status not in [JobStatus.FAILED, JobStatus.PENDING, JobStatus.PROCESSING]:
        print("재시작할 수 없는 상태이거나 작업이 없습니다.")
        return

    job.status = JobStatus.PROCESSING
    db.commit()

    try:
        while job.stage != PipelineStage.COMPLETED:
            if job.stage == PipelineStage.UPLOADED:
                print("1. 업로드 확인 및 초기화 완료")
                has_pdf = check_if_board_has_pdf(job.board_id, db)
                if has_pdf:
                    job.stage = PipelineStage.PDF_EXTRACTION
                else:
                    job.stage = PipelineStage.WHISPER_STT
            elif job.stage == PipelineStage.PDF_EXTRACTION:
                run_pdf_extraction(job, db)
                job.stage = PipelineStage.KEYWORD_EXTRACTION
            elif job.stage == PipelineStage.KEYWORD_EXTRACTION:
                run_keyword_extraction(job, db)
                job.stage = PipelineStage.WHISPER_STT
            elif job.stage == PipelineStage.WHISPER_STT:
                run_whisper_stt(job, db)
                job.stage = PipelineStage.AI_REFINEMENT
            elif job.stage == PipelineStage.AI_REFINEMENT:
                run_ai_refinement(job, db)
                job.stage = PipelineStage.COMPLETED
            else:
                raise ValueError(f"알 수 없는 파이프라인 단계입니다: {job.stage}")
            db.commit()
        job.status = JobStatus.COMPLETED
        job.error_message = None
        # Board 상태 업데이트
        try:
            board = db.query(Board).filter_by(id=job.board_id).one_or_none()
            if board is not None:
                board.status = BoardStatus.COMPLETED
                board.failed_reason = None
        except Exception:
            pass
        db.commit()
        print("🎉 파이프라인 전체 완료!")
    except Exception as e:
        # 1. 일단 런타임 에러 객체(e)에서 직접 메시지를 빼두거나, 
        # run_* 함수에서 세팅한 값을 미리 변수에 백업해 둡니다.
        error_msg_backup = job.error_message or str(e)
        
        # 2. 꼬여버린 DB 트랜잭션을 안전하게 초기화합니다.
        db.rollback()
        
        # 3. 롤백 '이후'에 FAILED 상태와 에러 메시지를 다시 세팅합니다.
        job.status = JobStatus.FAILED
        job.error_message = error_msg_backup
        # Board 상태를 FAILED로 설정
        try:
            board = db.query(Board).filter_by(id=job.board_id).one_or_none()
            if board is not None:
                board.status = BoardStatus.FAILED
                board.failed_reason = error_msg_backup
        except Exception:
            pass
        # 4. 이제 안전하게 커밋!
        db.commit()
        print(f"❌ 파이프라인 에러 발생 (Stage: {job.stage}): {error_msg_backup}")

def check_if_board_has_pdf(board_id: int, db: Session) -> bool:
    pdf_count = db.query(BoardAsset).filter_by(board_id=board_id, asset_type=AssetType.PDF).count()
    return pdf_count > 0
