

import { useEffect, useState } from "react"
import { fetchPdfAssetList } from "../api"
import type { PdfAsset } from "../types"
import { FileText, CheckCircle, Circle } from "lucide-react"

interface OptionalPdfLibraryListProps {
  onSelect: (asset: PdfAsset) => void
  selectedAssetId?: number | null
}

export function OptionalPdfLibraryList({ onSelect, selectedAssetId }: OptionalPdfLibraryListProps) {

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfs, setPdfs] = useState<PdfAsset[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchPdfAssetList()
      .then(setPdfs)
      .catch((err) => setError(err.message ?? "PDF 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false))
  }, [])


  // 파일명 검색 필터
  const filtered = search.trim().length > 0
    ? pdfs.filter((pdf) => pdf.filename.toLowerCase().includes(search.trim().toLowerCase()))
    : pdfs

  if (loading) return <div className="text-sm text-slate-500 py-8 w-full text-center">PDF 목록을 불러오는 중...</div>
  if (error) return <div className="text-sm text-red-500 py-8 w-full text-center">{error}</div>
  if (pdfs.length === 0) return <div className="text-sm text-slate-400 py-8 w-full text-center">업로드된 PDF가 없습니다.</div>

  return (
    <div className="w-full">
      <div className="mb-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="파일 이름 검색..."
          className="w-full rounded-[var(--radius-md)] border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[var(--color-brand-400)] focus:outline-none"
        />
      </div>
      <ul className="w-full max-h-64 overflow-y-auto rounded-[var(--radius-lg)] border bg-white divide-y">
        {filtered.length === 0 ? (
          <li className="py-8 text-center text-sm text-slate-400">검색 결과가 없습니다.</li>
        ) : filtered.map((pdf) => (
          <li
            key={pdf.asset_id}
            className={
              "flex items-center gap-3 px-4 py-3 cursor-pointer transition group " +
              (selectedAssetId === pdf.asset_id
                ? "bg-[var(--color-brand-50)] text-[var(--color-brand-600)] font-semibold"
                : "hover:bg-slate-50 text-[var(--color-text-default)]")
            }
            onClick={() => onSelect(pdf)}
          >
            {/* 선택 라디오/체크 */}
            <span className="mr-1">
              {selectedAssetId === pdf.asset_id ? (
                <CheckCircle className="w-5 h-5 text-[var(--color-brand-500)]" />
              ) : (
                <Circle className="w-5 h-5 text-slate-300 group-hover:text-[var(--color-brand-300)]" />
              )}
            </span>
            {/* 파일 아이콘 */}
            <FileText className="w-6 h-6 mr-2 text-[var(--color-brand-400)]" />
            {/* 파일명/날짜/용량 */}
            <div className="flex-1 min-w-0">
              <div className="truncate text-base font-medium">{pdf.filename}</div>
              {/* 아래는 예시: 실제로는 pdf에 업로드일, 용량 정보가 필요함 */}
              <div className="text-xs text-slate-400 mt-0.5 flex gap-2">
                <span>2023-10-12</span>
                <span>·</span>
                <span>4.2MB</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
