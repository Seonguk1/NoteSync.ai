export const APP_LAYOUT = {
  headerHeightPx: 56,
  playerHeightPx: 64,
  sidebarWidthPx: 272,
  panelGapPx: 16,
} as const

export const STUDY_SPLIT = {
  mediaDefault: 70,
  scriptDefault: 30,
  mediaMin: 30,
  scriptMin: 20,
} as const

export type StudySplitKey = keyof typeof STUDY_SPLIT
