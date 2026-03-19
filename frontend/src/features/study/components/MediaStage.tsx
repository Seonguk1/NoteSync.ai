import { useEffect, useMemo, useRef } from "react"

import { Pause, Play } from "lucide-react"

import type { PlaybackRate } from "../constants"
import { PdfViewer } from "./PdfViewer"

interface MediaStageProps {
  title: string
  instructor: string
  recordedAtLabel: string
  subtitleText: string
  isPlaying: boolean
  currentSeconds: number
  playbackRate: PlaybackRate
  volume: number
  mediaUrl?: string | null
  mediaMimeType?: string | null
  pdfUrl?: string | null
  onCurrentTimeChange: (seconds: number) => void
  onDurationChange: (seconds: number) => void
  onPlaybackStateChange: (isPlaying: boolean) => void
  onPlayPause: () => void
}

export function MediaStage({
  title,
  instructor,
  recordedAtLabel,
  subtitleText,
  isPlaying,
  currentSeconds,
  playbackRate,
  volume,
  mediaUrl,
  mediaMimeType,
  pdfUrl,
  onCurrentTimeChange,
  onDurationChange,
  onPlaybackStateChange,
  onPlayPause,
}: MediaStageProps) {
  const mediaRef = useRef<HTMLMediaElement | null>(null)
  const setMediaRef = (element: HTMLMediaElement | null) => {
    mediaRef.current = element
  }
  const isVideo = useMemo(() => (mediaMimeType ?? "").startsWith("video/"), [mediaMimeType])
  const isUserSeeking = useRef(false)

  const lastReportedTime = useRef(currentSeconds)

  // 1. 볼륨 동기화
  useEffect(() => {
    const media = mediaRef.current
    if (!media) return
    media.volume = volume
  }, [volume, mediaUrl])

  // 2. 재생 속도 동기화
  useEffect(() => {
    const media = mediaRef.current
    if (!media) return
    media.playbackRate = playbackRate
  }, [playbackRate, mediaUrl])

  // 3. 스킵(Seek) 동기화: 부모가 시간을 바꿨을 때 비디오 강제 이동
  useEffect(() => {
    const media = mediaRef.current
    if (!media) return

    // 👇 [핵심] 부모가 내려준 시간이 우리가 방금 보고한 시간과 거의 같다면? -> 메아리(Echo)이므로 무시!
    // 사용자가 프로그래스바를 드래그해서 시간이 0.5초 이상 훅! 뛰었을 때만 비디오를 강제 이동시킵니다.
    if (Math.abs(currentSeconds - lastReportedTime.current) > 0.5) {
      isUserSeeking.current = true
      media.currentTime = currentSeconds
      lastReportedTime.current = currentSeconds // 업데이트
    }
  }, [currentSeconds, mediaUrl])

  // 4. 🚨 아까 사라졌던 부분 복구! (재생/일시정지 상태 동기화) 🚨
  useEffect(() => {
    const media = mediaRef.current
    if (!media) return

    if (isPlaying) {
      void media.play().catch(() => {
        onPlaybackStateChange(false)
      })
      return
    }

    media.pause()
  }, [isPlaying, onPlaybackStateChange, mediaUrl])

  // 5. 비디오 이벤트 리스너 통합 (여기서 시간, 재생상태, 스킵완료 등을 부모에게 보고합니다)
  useEffect(() => {
    const media = mediaRef.current
    if (!media) return
    const activeMedia = media

    function handleTimeUpdate() {
      if (!isUserSeeking.current) {
        // 👇 [핵심] 부모에게 시간을 보고할 때마다 '내가 언제 보고했는지' 기록해둡니다.
        lastReportedTime.current = activeMedia.currentTime
        onCurrentTimeChange(activeMedia.currentTime)
      }
    }

    function handleLoadedMetadata() {
      if (Number.isFinite(activeMedia.duration) && activeMedia.duration > 0) {
        onDurationChange(activeMedia.duration)
      }
    }

    function handlePlay() {
      onPlaybackStateChange(true)
    }

    function handlePause() {
      onPlaybackStateChange(false)
    }

    function handleSeeked() {
      isUserSeeking.current = false
    }

    activeMedia.addEventListener("timeupdate", handleTimeUpdate)
    activeMedia.addEventListener("loadedmetadata", handleLoadedMetadata)
    activeMedia.addEventListener("play", handlePlay)
    activeMedia.addEventListener("pause", handlePause)
    activeMedia.addEventListener("seeked", handleSeeked)

    return () => {
      activeMedia.removeEventListener("timeupdate", handleTimeUpdate)
      activeMedia.removeEventListener("loadedmetadata", handleLoadedMetadata)
      activeMedia.removeEventListener("play", handlePlay)
      activeMedia.removeEventListener("pause", handlePause)
      activeMedia.removeEventListener("seeked", handleSeeked)
    }
  }, [onCurrentTimeChange, onDurationChange, onPlaybackStateChange, mediaUrl])

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* 미디어 컨테이너 */}
      <div className="group relative aspect-video w-full overflow-hidden rounded-[var(--radius-xl)] bg-black shadow-[var(--shadow-soft)]">
        {mediaUrl ? (
          isVideo ? (
            <video className="h-full w-full bg-black object-contain" ref={setMediaRef} src={mediaUrl} />
          ) : pdfUrl ? (
            <div className="relative h-full w-full bg-slate-100">
              <audio ref={setMediaRef} src={mediaUrl} />
              <PdfViewer pdfUrl={pdfUrl} />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <audio ref={setMediaRef} src={mediaUrl} />
              <span className="select-none text-sm text-slate-200">오디오 파일 재생 중</span>
            </div>
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
            <span className="select-none text-sm text-slate-500">미디어 화면 (Video / PDF)</span>
          </div>
        )}

        {/* 자막 오버레이 */}
        {subtitleText ? (
          <div className="absolute bottom-8 left-1/2 w-[90%] max-w-6xl -translate-x-1/2">
            {/* 👇 [커스텀 가능] 하단에 설정된 'w-[90%]', 'max-w-6xl' 등을 부모 div에서 수정해 너비를 조정할 수 있습니다 */}
            <div className="rounded-[var(--radius-md)] border border-white/10 bg-black/70 px-6 py-4 text-center font-semibold leading-relaxed text-white text-2xl md:text-3xl backdrop-blur-md">
              {subtitleText}
            </div>
          </div>
        ) : null}

        {/* 호버 시 재생/일시정지 오버레이 (비디오 또는 오디오만 있을 때 표시, PDF가 있으면 스크롤 방해 방지) */}
        {!pdfUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              aria-label={isPlaying ? "일시정지" : "재생"}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-brand-500)]/90 text-white shadow-xl transition-transform hover:scale-110"
              onClick={onPlayPause}
              type="button"
            >
              {isPlaying ? <Pause className="h-10 w-10" /> : <Play className="h-10 w-10 translate-x-0.5" />}
            </button>
          </div>
        )}
      </div>

      {/* 강의 메타 정보 */}
      <div className="mt-6">
        <h2 className="text-xl font-bold text-[var(--color-text-strong)]">{title}</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {instructor} · {recordedAtLabel}
        </p>
      </div>
    </div>
  )
}