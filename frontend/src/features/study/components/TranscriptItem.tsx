import { useEffect, useState, forwardRef } from "react"

import { Check, Pencil, Volume2 } from "lucide-react"
import { cleanSubtitle } from "../screens/BoardDetailsScreen"
import { cn } from "../../../lib/cn"
import { TRANSCRIPT_ITEM_STATE, type TranscriptItemState, type TranscriptSegment } from "../types"

interface TranscriptItemProps {
  segment: TranscriptSegment
  state: TranscriptItemState
  onActivate: () => void
  onStartEdit: () => void
  onFinishEdit: (newText: string) => void
}

function TimestampChip({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-bold",
        active
          ? "bg-[var(--color-brand-500)] text-white shadow-sm"
          : "bg-[var(--color-brand-100)] text-[var(--color-brand-600)]",
      )}
    >
      {label}
    </span>
  )
}

export const TranscriptItem = forwardRef<HTMLDivElement, TranscriptItemProps>(
  function TranscriptItem({ segment, state, onActivate, onStartEdit, onFinishEdit }, ref) {
  const [editedText, setEditedText] = useState(() => cleanSubtitle(segment.text))

  // 편집 모드 진입 시 현재 텍스트로 초기화
  useEffect(() => {
    if (state === TRANSCRIPT_ITEM_STATE.editing) {
      setEditedText(cleanSubtitle(segment.text))
    }
  }, [state, segment.text])

  const handleSave = () => {
    // 원본 텍스트에서 타임스탬프 부분("[00:00 -> 00:05] ")만 쏙 뽑아냅니다.
    const match = segment.text.match(/^\[\d{2}:\d{2}\s*->\s*\d{2}:\d{2}\]\s*/);
    const prefix = match ? match[0] : "";
    
    // 타임스탬프 + 사용자가 수정한 텍스트를 합쳐서 부모에게 넘깁니다!
    onFinishEdit(prefix + editedText.trim());
  }

  if (state === TRANSCRIPT_ITEM_STATE.editing) {
    return (
      <div ref={ref} className="rounded-[var(--radius-xl)] border border-[var(--color-brand-400)] bg-white p-4 shadow-[var(--shadow-card)]">
        <TimestampChip active label={segment.timestampLabel} />
        <div className="mt-2 flex items-start gap-2">
          <textarea
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            className="flex-1 resize-none bg-transparent p-0 text-sm leading-relaxed text-[var(--color-text-strong)] outline-none"
            onChange={(e) => setEditedText(e.target.value)}
            rows={3}
            value={editedText}
          />
          <button
            aria-label="편집 완료"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-500)] text-white shadow-lg transition-colors hover:bg-[var(--color-brand-600)]"
            onClick={handleSave}
            type="button"
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  if (state === TRANSCRIPT_ITEM_STATE.active) {
    return (
      <div
        ref={ref}
        className="relative cursor-pointer rounded-[var(--radius-xl)] border border-[var(--color-brand-100)] bg-[var(--color-brand-50)] p-4 shadow-sm ring-1 ring-[var(--color-brand-100)]"
        onClick={onActivate}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onActivate()}
      >
        <TimestampChip active label={segment.timestampLabel} />
        <p className="mt-2 text-sm font-medium italic leading-relaxed text-[var(--color-text-strong)]">
          {cleanSubtitle(segment.text)}
        </p>
        <div className="absolute right-4 top-4">
          <Volume2 className="h-4 w-4 text-[var(--color-brand-400)]" />
        </div>
        <button
          aria-label="스크립트 편집"
          className="absolute bottom-3 right-3 rounded p-1 text-[var(--color-brand-400)] opacity-0 transition-opacity hover:opacity-100 hover:text-[var(--color-brand-600)] focus:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            onStartEdit()
          }}
          type="button"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  // normal 상태
  return (
    <div
      ref={ref}
      className="group relative cursor-pointer rounded-[var(--radius-xl)] border border-transparent p-4 transition-all hover:border-slate-100 hover:bg-slate-50"
      onClick={onActivate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onActivate()}
    >
      <TimestampChip active={false} label={segment.timestampLabel} />
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)] group-hover:text-[var(--color-text-default)]">
        {cleanSubtitle(segment.text)}
      </p>
      <button
        aria-label="스크립트 편집"
        className="absolute bottom-3 right-3 rounded p-1 text-[var(--color-text-muted)] opacity-0 transition-opacity hover:text-[var(--color-text-strong)] group-hover:opacity-100 focus:opacity-100"
        onClick={(e) => {
          e.stopPropagation()
          onStartEdit()
        }}
        type="button"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
);
