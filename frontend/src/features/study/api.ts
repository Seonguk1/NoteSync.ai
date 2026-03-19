import { apiRequest } from "../../lib/api-client"

import type { BoardInfo, BoardMedia, TranscriptSegment } from "./types"

interface BoardDetailResponse {
  id: number
  folder: {
    id: number
    name: string
  }
  title: string
  status: "queued" | "processing" | "completed" | "failed"
  media: {
    url: string
    mime_type: string
    duration_sec: number | null
  } | null
  pdf?: {
    url: string
    mime_type: string
  } | null
  segments: Array<{
    id: number
    seq: number
    start_ms: number
    end_ms: number
    text: string
  }>
  created_at: string
}

interface BoardDetailData {
  folderId: number | null
  boardInfo: BoardInfo
  media: BoardMedia | null
  pdf?: BoardMedia | null
  transcript: TranscriptSegment[]
}

interface FolderListResponse {
  items: Array<{
    id: number
    name: string
  }>
}

interface FolderOption {
  id: number
  name: string
}

interface SegmentUpdateRequest {
  segments: Array<{
    id: number
    seq: number
    start_ms: number
    end_ms: number
    text: string
  }>
}

interface SegmentUpdateResponse {
  board_id: number
  saved_count: number
  status: string
  updated_at: string
}

interface UpdateBoardMetaRequest {
  title?: string
  folder_id?: number
}

interface UpdateBoardMetaResponse {
  id: number
  folder: {
    id: number
    name: string
  }
  title: string
  status: "queued" | "processing" | "completed" | "failed"
  updated_at: string
}

function toTimestampLabel(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function formatRecordedAtLabel(isoText: string): string {
  const date = new Date(isoText)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
  }).format(date)
}

function mapBoardDetail(response: BoardDetailResponse): BoardDetailData {
  const transcript = [...response.segments]
    .sort((a, b) => a.seq - b.seq)
    .map((segment) => {
      const startSeconds = Math.max(0, Math.floor(segment.start_ms / 1000))
      return {
        id: segment.id,
        startSeconds,
        timestampLabel: toTimestampLabel(startSeconds),
        text: segment.text,
      }
    })

  return {
    folderId: response.folder.id,
    boardInfo: {
      folder: response.folder.name,
      title: response.title,
      instructor: "강의자 정보 없음",
      recordedAtLabel: formatRecordedAtLabel(response.created_at),
      durationSeconds: response.media?.duration_sec ?? 0,
    },
    media: response.media
      ? {
          url: response.media.url,
          mimeType: response.media.mime_type,
        }
      : null,
    pdf: response.pdf
      ? {
          url: response.pdf.url,
          mimeType: response.pdf.mime_type,
        }
      : null,
    transcript,
  }
}

export async function fetchBoardDetail(boardId: number): Promise<BoardDetailData> {
  const response = await apiRequest<BoardDetailResponse>(`/boards/${boardId}`)
  return mapBoardDetail(response)
}

export async function fetchFolderOptions(): Promise<FolderOption[]> {
  const response = await apiRequest<FolderListResponse>("/folders")
  return response.items.map((item) => ({
    id: item.id,
    name: item.name,
  }))
}

export async function updateBoardSegments(boardId: number, segments: TranscriptSegment[]): Promise<SegmentUpdateResponse> {
  const payload: SegmentUpdateRequest = {
    segments: segments.map((segment, index) => {
      const startMs = Math.max(0, Math.floor(segment.startSeconds * 1000))
      const nextStartMs =
        index < segments.length - 1
          ? Math.max(0, Math.floor(segments[index + 1].startSeconds * 1000))
          : startMs + 5000
      const endMs = Math.max(startMs + 1000, nextStartMs - 1)

      return {
        id: segment.id,
        seq: index + 1,
        start_ms: startMs,
        end_ms: endMs,
        text: segment.text,
      }
    }),
  }

  return apiRequest<SegmentUpdateResponse>(`/boards/${boardId}/segments`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function updateBoardMeta(
  boardId: number,
  payload: UpdateBoardMetaRequest,
): Promise<UpdateBoardMetaResponse> {
  return apiRequest<UpdateBoardMetaResponse>(`/boards/${boardId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}
