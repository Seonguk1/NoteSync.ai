// PDF 파일(강의 자료) 단일 항목 타입
export interface PdfAsset {
  asset_id: number
  filename: string
  mime_type: string
  url: string
}

// PDF 파일 목록 응답 타입
export interface PdfAssetListResponse {
  items: PdfAsset[]
}
export interface UploadFormState {
  lectureName: string
  topic: string
  mediaFile: File | null
  pdfFile: File | null
  // 기존 업로드 파일 대신 라이브러리에서 선택한 PDF 자산 ID를 저장
  pdfAssetId: number | null
}

export interface UploadProgressState {
  isSubmitting: boolean
  statusMessage: string
}
