import { useState } from "react"

import { ChevronDown, Maximize2, Pause, Play, RotateCcw, RotateCw, Volume2 } from "lucide-react"

import { DropdownMenu } from "../../../components/ui"
import type { PlaybackRate } from "../constants"
import { PLAYBACK_RATES } from "../constants"

interface PlayerBarProps {
  currentSeconds: number
  durationSeconds: number
  isPlaying: boolean
  volume: number
  playbackRate: PlaybackRate
  onPlayPause: () => void
  onSeek: (seconds: number) => void
  onSkipBack: () => void
  onSkipForward: () => void
  onVolumeChange: (volume: number) => void
  onRateChange: (rate: PlaybackRate) => void
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }
  return `${m}:${s.toString().padStart(2, "0")}`
}

const toggleFullscreen = async () => {
  if (!document.fullscreenElement) {
    // 👇 특정 div가 아니라 '문서 전체(html 태그)'를 전체화면으로!
    await document.documentElement.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
};

export function PlayerBar({
  currentSeconds,
  durationSeconds,
  isPlaying,
  volume,
  playbackRate,
  onPlayPause,
  onSeek,
  onSkipBack,
  onSkipForward,
  onVolumeChange,
  onRateChange,
}: PlayerBarProps) {
  const [isRateMenuOpen, setIsRateMenuOpen] = useState(false)
  const progressPercent = durationSeconds > 0 ? (currentSeconds / durationSeconds) * 100 : 0

  return (
    <footer className="shrink-0 border-t border-slate-200 bg-[var(--color-surface-elevated)]">
      {/* 진행 바 (클릭/드래그 스크럽) */}
      <div className="group relative h-1.5 w-full cursor-pointer bg-slate-100">
        {/* 진행률 채움 */}
        <div
          className="pointer-events-none absolute left-0 top-0 h-full bg-[var(--color-brand-500)] transition-[width]"
          style={{ width: `${progressPercent}%` }}
        />
        {/* 썸 핸들 */}
        <div
          className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-[var(--color-brand-500)] shadow-lg transition-transform group-hover:scale-100"
          style={{ left: `${progressPercent}%` }}
        />
        <input
          aria-label="재생 위치"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          max={durationSeconds}
          min={0}
          onChange={(e) => onSeek(Number(e.target.value))}
          step={1}
          type="range"
          value={currentSeconds}
        />
      </div>

      {/* 컨트롤 영역 */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-6 py-3">
        {/* 왼쪽: 시간 표시 */}
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold tabular-nums justify-self-start">
          <span className="text-[var(--color-brand-600)]">{formatTime(currentSeconds)}</span>
          <span className="text-slate-300">/</span>
          <span className="text-[var(--color-text-muted)]">{formatTime(durationSeconds)}</span>
        </div>

        {/* 가운데: 재생 컨트롤 */}
        <div className="flex items-center gap-5 justify-self-center">
          {/* 5초 되감기 */}
          <button
            aria-label="5초 뒤로"
            className="text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-strong)]"
            onClick={onSkipBack}
            type="button"
          >
            <RotateCcw className="h-5 w-5" />
          </button>

          {/* 재생/일시정지 */}
          <button
            aria-label={isPlaying ? "일시정지" : "재생"}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-brand-500)] text-white shadow-lg shadow-[var(--color-brand-500)]/30 transition-transform hover:scale-105"
            onClick={onPlayPause}
            type="button"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 translate-x-0.5" />
            )}
          </button>

          {/* 5초 앞으로 */}
          <button
            aria-label="5초 앞으로"
            className="text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-strong)]"
            onClick={onSkipForward}
            type="button"
          >
            <RotateCw className="h-5 w-5" />
          </button>
        </div>

        {/* 오른쪽: 속도 / 볼륨 / 전체화면 */}
        <div className="flex min-w-0 items-center justify-end gap-4 justify-self-end">
          {/* 재생 속도 */}
          <div className="relative">
            <button
              aria-label="재생 속도 변경"
              className="flex items-center gap-0.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200"
              onClick={() => setIsRateMenuOpen((prev) => !prev)}
              type="button"
            >
              {playbackRate}x
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
            {isRateMenuOpen ? (
              <DropdownMenu
                items={PLAYBACK_RATES.map((rate) => ({
                  active: rate === playbackRate,
                  label: `${rate}x`,
                  onClick: () => onRateChange(rate),
                }))}
                onClose={() => setIsRateMenuOpen(false)}
                position="top"
              />
            ) : null}
          </div>

          {/* 볼륨 슬라이더 */}
          <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
            <Volume2 className="h-5 w-5" />
            <div className="relative h-1 w-20 rounded-full bg-slate-200">
              <div
                className="pointer-events-none absolute left-0 top-0 h-full rounded-full bg-[var(--color-brand-500)]"
                style={{ width: `${volume * 100}%` }}
              />
              <input
                aria-label="볼륨"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                max={1}
                min={0}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                step={0.01}
                type="range"
                value={volume}
              />
            </div>
          </div>

          {/* 전체화면 */}
          <button
            aria-label="전체화면"
            className="text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-strong)]"
            onClick={toggleFullscreen}
            type="button"
          >
            <Maximize2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </footer>
  )
}
