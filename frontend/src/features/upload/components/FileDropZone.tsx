import { useState } from "react"

import { Upload } from "lucide-react"

import { cn } from "../../../lib/cn"

interface FileDropZoneProps {
  title: string
  description: string
  accept: string
  file: File | null
  onFileSelect: (file: File | null) => void
}

export function FileDropZone({ title, description, accept, file, onFileSelect }: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)

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
    <label
      className="group relative block cursor-pointer"
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        accept={accept}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        onChange={(event) => onFileSelect(event.target.files?.[0] ?? null)}
        type="file"
      />
      <div
        className={cn(
          "flex h-48 w-full flex-col items-center justify-center rounded-[var(--radius-lg)] border-2 border-dashed px-6 text-center transition-all",
          isDragOver
            ? "border-[var(--color-brand-500)] bg-[var(--color-brand-100)]"
            : file
              ? "border-[var(--color-brand-400)] bg-[var(--color-brand-50)]"
              : "border-slate-200 bg-slate-50/70 hover:border-[var(--color-brand-300)] hover:bg-slate-50",
        )}
      >
        <div className="mb-3 rounded-full bg-[var(--color-brand-100)] p-4 text-[var(--color-brand-600)] transition-transform group-hover:scale-110">
          <Upload className="h-8 w-8" />
        </div>
        <p className="text-sm font-semibold text-[var(--color-text-strong)]">{file ? file.name : title}</p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{file ? "다른 파일을 선택하려면 클릭하세요." : description}</p>
      </div>
    </label>
  )
}
