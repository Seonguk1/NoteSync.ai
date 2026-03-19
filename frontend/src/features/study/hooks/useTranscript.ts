import { useCallback, useEffect, useState } from "react"
import { updateBoardSegments } from "../api"
import type { TranscriptSegment } from "../types"

export function useTranscript({
  initialSegments,
  currentSeconds,
  isPlaying,
  boardId,
}: {
  initialSegments: TranscriptSegment[]
  currentSeconds: number
  isPlaying: boolean
  boardId: number | string
}) {
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>(initialSegments)
  const [activeSegmentId, setActiveSegmentId] = useState(
    initialSegments[0]?.id ?? 0
  )
  const [editingSegmentId, setEditingSegmentId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // 고속 탐색: 재생 시간에 따라 activeSegmentId 동기화
  useEffect(() => {
    if (!isPlaying) return
    let matchingId = transcriptSegments[0]?.id
    for (let i = transcriptSegments.length - 1; i >= 0; i--) {
      if (transcriptSegments[i].startSeconds <= currentSeconds) {
        matchingId = transcriptSegments[i].id
        break
      }
    }
    if (matchingId !== undefined && matchingId !== activeSegmentId) {
      setActiveSegmentId(matchingId)
    }
  }, [currentSeconds, transcriptSegments, activeSegmentId, isPlaying])

  // 세그먼트 클릭/포커스
  const handleActivate = useCallback((id: number, startSeconds: number) => {
    setActiveSegmentId(id)
    // 재생 위치 이동은 상위에서 처리
    setEditingSegmentId(null)
  }, [])

  // 편집 시작
  const handleStartEdit = useCallback((id: number) => {
    setEditingSegmentId(id)
  }, [])

  // 편집 완료
  const handleFinishEdit = useCallback(
    async (segmentId: number, newText: string) => {
      const trimmedText = newText.trim()
      if (!trimmedText) {
        // 상위에서 에러 처리 필요
        return
      }
      const previousSegments = transcriptSegments
      const nextSegments = previousSegments.map((seg) =>
        seg.id === segmentId ? { ...seg, text: trimmedText } : seg
      )
      setTranscriptSegments(nextSegments)
      setEditingSegmentId(null)
      const numId = typeof boardId === "string" ? Number(boardId) : boardId
      if (!Number.isFinite(numId) || numId <= 0) return
      try {
        await updateBoardSegments(numId, nextSegments)
      } catch {
        setTranscriptSegments(previousSegments)
        // 상위에서 에러 처리 필요
      }
    },
    [transcriptSegments, boardId]
  )

  return {
    transcriptSegments,
    setTranscriptSegments,
    activeSegmentId,
    setActiveSegmentId,
    editingSegmentId,
    setEditingSegmentId,
    searchQuery,
    setSearchQuery,
    handleActivate,
    handleStartEdit,
    handleFinishEdit,
  }
}
