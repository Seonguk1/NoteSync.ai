export const TRANSCRIPT_ITEM_STATE = {
  normal: "normal",
  active: "active",
  editing: "editing",
} as const

export type TranscriptItemState = (typeof TRANSCRIPT_ITEM_STATE)[keyof typeof TRANSCRIPT_ITEM_STATE]

export interface TranscriptSegment {
  id: number
  startSeconds: number
  timestampLabel: string
  text: string
}

export interface BoardInfo {
  folder: string
  title: string
  instructor: string
  recordedAtLabel: string
  durationSeconds: number
}

export interface BoardMedia {
  url: string
  mimeType: string
}
