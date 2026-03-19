import { useCallback, useState } from "react"
import { PLAYBACK_RATES, type PlaybackRate } from "../constants"

const SKIP_SECONDS = 5

export function usePlayback(durationSeconds: number, initialSeconds: number = 0) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSeconds, setCurrentSeconds] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1.0)

  const handlePlayPause = useCallback(() => setIsPlaying((prev) => !prev), [])

  const handleSeek = useCallback((seconds: number) => {
    const clamped = Math.max(0, Math.min(durationSeconds, seconds))
    setCurrentSeconds(clamped)
  }, [durationSeconds])

  const handleSkipBack = useCallback(() => {
    setCurrentSeconds((prev) => Math.max(0, prev - SKIP_SECONDS))
  }, [])

  const handleSkipForward = useCallback(() => {
    setCurrentSeconds((prev) => Math.min(durationSeconds, prev + SKIP_SECONDS))
  }, [durationSeconds])

  const handleMediaTimeUpdate = useCallback((seconds: number) => {
    setCurrentSeconds(seconds)
  }, [])

  const handleMediaPlaybackStateChange = useCallback((nextIsPlaying: boolean) => {
    setIsPlaying(nextIsPlaying)
  }, [])

  return {
    isPlaying,
    currentSeconds,
    volume,
    playbackRate,
    setVolume,
    setPlaybackRate,
    handlePlayPause,
    handleSeek,
    handleSkipBack,
    handleSkipForward,
    handleMediaTimeUpdate,
    handleMediaPlaybackStateChange,
  }
}
