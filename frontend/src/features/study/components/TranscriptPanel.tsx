import { ChevronLeft, ChevronRight } from "lucide-react"
import { useMemo, useEffect, useRef } from "react"

import { IconButton, SearchInput } from "../../../components/ui"
import { TRANSCRIPT_ITEM_STATE, type TranscriptSegment } from "../types"
import { TranscriptItem } from "./TranscriptItem"

interface TranscriptPanelProps {
  segments: TranscriptSegment[]
  activeSegmentId: number
  editingSegmentId: number | null
  searchQuery: string
  onSearchChange: (query: string) => void
  onActivate: (id: number, startSeconds: number) => void
  onStartEdit: (id: number) => void
  onFinishEdit: (id: number, newText: string) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function TranscriptPanel({
  segments,
  activeSegmentId,
  editingSegmentId,
  searchQuery,
  onSearchChange,
  onActivate,
  onStartEdit,
  onFinishEdit,
  isCollapsed,
  onToggleCollapse,
}: TranscriptPanelProps) {
  const filteredSegments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return segments
    return segments.filter((seg) => seg.text.toLowerCase().includes(q) || seg.timestampLabel.includes(q))
  }, [segments, searchQuery])

  // 각 segment id별로 ref를 관리
  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({})

  // activeSegmentId가 바뀔 때 해당 항목으로 스크롤
  useEffect(() => {
    const ref = itemRefs.current[activeSegmentId]
    if (ref) {
      ref.scrollIntoView({ block: "center", behavior: "smooth" })
    }
  }, [activeSegmentId, filteredSegments])

  return (
    <div className="flex h-full flex-col border-l border-slate-200 bg-[var(--color-surface-elevated)]">
      {/* 검색 헤더 */}
      <div className="shrink-0 border-b border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <IconButton
            aria-label={isCollapsed ? "스크립트 패널 펼치기" : "스크립트 패널 접기"}
            icon={isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            onClick={onToggleCollapse}
            size="sm"
          />
          {!isCollapsed ? (
            <div className="flex-1">
              <SearchInput
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="스크립트 검색..."
                value={searchQuery}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* 스크립트 목록 */}
      {isCollapsed ? (
        <div className="flex flex-1 items-center justify-center p-4 text-xs font-semibold tracking-[0.12em] text-[var(--color-text-muted)] [writing-mode:vertical-rl]">
          SCRIPT
        </div>
      ) : (
        <div className="flex-1 space-y-3 overflow-y-auto p-4 [scrollbar-width:thin]">
          {filteredSegments.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">검색 결과가 없습니다.</p>
          ) : (
            filteredSegments.map((seg) => {
              const state =
                editingSegmentId === seg.id
                  ? TRANSCRIPT_ITEM_STATE.editing
                  : activeSegmentId === seg.id
                    ? TRANSCRIPT_ITEM_STATE.active
                    : TRANSCRIPT_ITEM_STATE.normal

              return (
                <TranscriptItem
                  key={seg.id}
                  segment={seg}
                  state={state}
                  onActivate={() => onActivate(seg.id, seg.startSeconds)}
                  onFinishEdit={(newText) => onFinishEdit(seg.id, newText)}
                  onStartEdit={() => onStartEdit(seg.id)}
                  ref={(el: HTMLDivElement | null) => {
                    itemRefs.current[seg.id] = el
                  }}
                />
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
