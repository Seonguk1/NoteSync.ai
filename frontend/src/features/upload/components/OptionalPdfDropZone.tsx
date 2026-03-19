import { useState } from "react"
import { OptionalPdfLibraryList } from "./OptionalPdfLibraryList"
import type { PdfAsset } from "../types"

import { Paperclip } from "lucide-react"

import { cn } from "../../../lib/cn"

interface OptionalPdfDropZoneProps {
  file: File | null
  onFileSelect: (file: File | null) => void
  // 라이브러리에서 선택 시 asset 정보를 전달
  onLibrarySelect: (asset: PdfAsset | null) => void
}

export function OptionalPdfDropZone({ file, onFileSelect, onLibrarySelect }: OptionalPdfDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [mode, setMode] = useState<'upload' | 'library'>('upload')
  const [selectedLibraryAsset, setSelectedLibraryAsset] = useState<null | { asset_id: number, filename: string, mime_type: string, url: string }>(null)

  function handleDragOver(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0])
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-[var(--color-text-default)]">강의 자료 (선택 사항)</p>
      <div className="flex mb-2">
        <div className="flex w-fit rounded-[var(--radius-lg)] bg-[var(--color-surface-muted)] border border-[var(--color-brand-50)] p-1">
          <button
            type="button"
            className={cn(
              "px-4 py-1.5 rounded-[var(--radius-md)] text-sm font-semibold transition-all",
              mode === 'upload'
                ? 'bg-white text-[var(--color-brand-500)] shadow-sm'
                : 'bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-brand-500)]'
            )}
            style={{ minWidth: 120 }}
            onClick={() => setMode('upload')}
          >파일 직접 업로드</button>
          <button
            type="button"
            className={cn(
              "px-4 py-1.5 rounded-[var(--radius-md)] text-sm font-semibold transition-all",
              mode === 'library'
                ? 'bg-white text-[var(--color-brand-500)] shadow-sm'
                : 'bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-brand-500)]'
            )}
            style={{ minWidth: 120 }}
            onClick={() => setMode('library')}
          >라이브러리에서 선택</button>
        </div>
      </div>
      {mode === 'upload' ? (
        <label
          className="group relative block cursor-pointer"
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            accept="application/pdf,.pdf"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            onChange={(event) => {
              setSelectedLibraryAsset(null)
              onFileSelect(event.target.files?.[0] ?? null)
              event.target.value = ''
            }}
            type="file"
          />
          <div
            className={cn(
              "flex h-32 w-full flex-col items-center justify-center rounded-[var(--radius-lg)] border-2 border-dashed px-6 text-center transition-all",
              isDragOver
                ? "border-[var(--color-brand-500)] bg-[var(--color-brand-100)]"
                : file
                  ? "border-[var(--color-brand-400)] bg-[var(--color-brand-50)]"
                  : "border-slate-200 bg-slate-50/70 hover:border-[var(--color-brand-300)] hover:bg-slate-50",
            )}
          >
            <div className="mb-2 rounded-full bg-slate-100 p-3 text-[var(--color-text-muted)] transition-colors group-hover:text-[var(--color-brand-600)]">
              <Paperclip className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-[var(--color-text-default)]">{file ? file.name : "참고용 강의 자료를 업로드하세요"}</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{file ? "다른 PDF를 선택하려면 클릭하세요." : "PDF만 지원 (최대 100MB)"}</p>
          </div>
        </label>
      ) : (
        <div className="w-full">
          <OptionalPdfLibraryList
            onSelect={(asset) => {
              setSelectedLibraryAsset(asset)
              onLibrarySelect(asset)
            }}
            selectedAssetId={selectedLibraryAsset?.asset_id ?? null}
          />
        </div>
      )}
    </div>
  )
}
