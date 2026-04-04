import os


def extract_pdf_text(file_path: str) -> str:
    """
    PDF 파일 경로를 받아 전체 텍스트를 추출하여 반환합니다.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF 파일을 찾을 수 없습니다: {file_path}")

    print(f"📄 PDF 텍스트 추출 시작: {file_path}")
    text_content = []
    num_pages = 0
    
    try:
        # PyMuPDF는 개발 환경에 설치되지 않을 수 있으므로 함수 내부에서 동적으로 임포트합니다.
        try:
            import fitz  # PyMuPDF
        except Exception as ie:
            raise RuntimeError("PyMuPDF(fitz) 라이브러리가 설치되어 있지 않습니다.") from ie

        # PyMuPDF로 문서 열기
        with fitz.open(file_path) as doc:
            for page_num, page in enumerate(doc):
                # 각 페이지의 텍스트 추출
                text = page.get_text()
                if text:
                    text_content.append(text)
            num_pages = len(doc)

        final_text = "\n".join(text_content)
        print(f"✅ PDF 추출 완료 (총 {num_pages}페이지, {len(final_text)}자)")
        return final_text

    except Exception as e:
        print(f"❌ PDF 추출 중 오류 발생: {e}")
        raise e