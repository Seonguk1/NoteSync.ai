export const LECTURE_STATUS = {
  completed: "completed",
  processing: "processing",
  failed: "failed",
} as const

export type LectureStatus = (typeof LECTURE_STATUS)[keyof typeof LECTURE_STATUS]

export interface LectureItem {
  id: number
  folderId?: number
  title: string
  lengthLabel: string
  createdAtLabel: string
  status: LectureStatus
  progressPercent?: number
}

export interface FolderItem {
  id: number
  name: string
  boardCount?: number
}
