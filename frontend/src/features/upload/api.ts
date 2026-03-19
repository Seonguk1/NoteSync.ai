
import { apiRequest } from "../../lib/api-client"
import type { PdfAsset, PdfAssetListResponse } from "./types"

/**
 * 업로드된 PDF(강의 자료) 목록 조회
 * @returns PdfAsset[]
 */
export async function fetchPdfAssetList(): Promise<PdfAsset[]> {
  const response = await apiRequest<PdfAssetListResponse>("/files/pdfs")
  return response.items
}
