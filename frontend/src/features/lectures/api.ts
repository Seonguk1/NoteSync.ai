import { apiRequest } from "../../lib/api-client"
import { LECTURE_STATUS, type FolderItem, type LectureItem } from "./types"

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "/api"

function toAbsoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path
  }
  if (!API_BASE_URL) {
    return path
  }
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
}

interface FolderListResponse {
  items: Array<{
    id: number
    name: string
    board_count: number
  }>
}

interface BoardSummaryResponse {
  id: number
  title: string
  status: "queued" | "processing" | "completed" | "failed"
  media_duration_sec: number | null
  created_at: string
  progress: {
    progress_percent: number
  } | null
  folder: {
    id: number
    name: string
  }
}

interface BoardListResponse {
  items: BoardSummaryResponse[]
}

interface BoardStatusResponse {
  board_id: number
  status: "queued" | "processing" | "completed" | "failed"
  progress_percent: number
}

interface CreateFolderRequest {
  name: string
}

interface UploadBoardRequest {
  folderName: string
  boardTitle: string
  mediaFile: File
  pdfFile?: File | null
  pdfAssetId?: number | null
  onUploadProgress?: (progressPercent: number) => void
}

interface UploadBoardResponse {
  board_id: number
}

interface UpdateFolderRequest {
  name: string
}

interface UpdateBoardRequest {
  title?: string
  folder_id?: number
}

interface UpdateBoardResponse {
  id: number
  folder: {
    id: number
    name: string
  }
  title: string
  status: "queued" | "processing" | "completed" | "failed"
  updated_at: string
}

function toLectureStatus(status: BoardSummaryResponse["status"]): LectureItem["status"] {
  if (status === "failed") return LECTURE_STATUS.failed
  if (status === "completed") return LECTURE_STATUS.completed
  return LECTURE_STATUS.processing
}

function formatDuration(totalSeconds: number | null): string {
  if (!totalSeconds || totalSeconds <= 0) {
    return "-"
  }
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

function formatCreatedAt(isoText: string): string {
  // 백엔드가 UTC 시간을 넘겨주는데 'Z'가 빠진 채로 올 경우를 대비해 보정
  const normalizedIso = isoText.endsWith("Z") || isoText.includes("+") ? isoText : `${isoText}Z`
  const date = new Date(normalizedIso)
  if (Number.isNaN(date.getTime())) {
    return isoText
  }
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function mapBoardToLectureItem(board: BoardSummaryResponse): LectureItem {
  return {
    id: board.id,
    folderId: board.folder.id,
    title: board.title,
    status: toLectureStatus(board.status),
    lengthLabel: formatDuration(board.media_duration_sec),
    createdAtLabel: formatCreatedAt(board.created_at),
    progressPercent: board.progress?.progress_percent,
  }
}

export async function fetchFolders(): Promise<FolderItem[]> {
  const response = await apiRequest<FolderListResponse>("/folders")
  return response.items.map((item) => ({
    id: item.id,
    name: item.name,
    boardCount: item.board_count,
  }))
}

export async function fetchBoards(): Promise<LectureItem[]> {
  const response = await apiRequest<BoardListResponse>("/boards")
  return response.items.map(mapBoardToLectureItem)
}

export async function fetchBoardStatus(boardId: number): Promise<BoardStatusResponse> {
  return apiRequest<BoardStatusResponse>(`/boards/${boardId}/status`)
}

export async function createFolder(name: string): Promise<void> {
  await apiRequest("/folders", {
    method: "POST",
    body: JSON.stringify({ name } satisfies CreateFolderRequest),
  })
}

export async function updateFolder(folderId: number, name: string): Promise<void> {
  await apiRequest(`/folders/${folderId}`, {
    method: "PATCH",
    body: JSON.stringify({ name } satisfies UpdateFolderRequest),
  })
}

export async function deleteFolder(folderId: number): Promise<void> {
  await apiRequest<void>(`/folders/${folderId}`, {
    method: "DELETE",
  })
}

export async function uploadBoard(payload: UploadBoardRequest): Promise<UploadBoardResponse> {
  const formData = new FormData()
  formData.append("folder_name", payload.folderName)
  formData.append("board_title", payload.boardTitle)
  formData.append("media_file", payload.mediaFile)
  if (payload.pdfFile) {
    formData.append("pdf_file", payload.pdfFile)
  }
  if (payload.pdfAssetId !== undefined && payload.pdfAssetId !== null) {
    formData.append("pdf_asset_id", String(payload.pdfAssetId))
  }

  if (payload.onUploadProgress) {
    return new Promise<UploadBoardResponse>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("POST", toAbsoluteUrl("/boards/upload"))
      xhr.responseType = "json"

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) {
          return
        }
        const progress = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)))
        payload.onUploadProgress?.(progress)
      }

      xhr.onload = () => {
        const isSuccess = xhr.status >= 200 && xhr.status < 300
        if (isSuccess) {
          payload.onUploadProgress?.(100)
          resolve(xhr.response as UploadBoardResponse)
          return
        }

        const responsePayload =
          xhr.response && typeof xhr.response === "object"
            ? (xhr.response as { message?: string })
            : null
        reject(new Error(responsePayload?.message ?? "업로드 요청에 실패했습니다."))
      }

      xhr.onerror = () => {
        reject(new Error("네트워크 오류로 업로드에 실패했습니다."))
      }

      xhr.send(formData)
    })
  }

  return apiRequest<UploadBoardResponse>("/boards/upload", {
    method: "POST",
    body: formData,
  })
}

export async function updateBoardMeta(
  boardId: number,
  payload: { title?: string; folderId?: number },
): Promise<UpdateBoardResponse> {
  const body: UpdateBoardRequest = {}
  if (payload.title !== undefined) {
    body.title = payload.title
  }
  if (payload.folderId !== undefined) {
    body.folder_id = payload.folderId
  }

  return apiRequest<UpdateBoardResponse>(`/boards/${boardId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export async function deleteBoard(boardId: number): Promise<void> {
  await apiRequest<void>(`/boards/${boardId}`, {
    method: "DELETE",
  })
}

export async function retryBoard(boardId: number): Promise<void> {
  await apiRequest(`/boards/${boardId}/retry`, {
    method: "POST",
  })
}
