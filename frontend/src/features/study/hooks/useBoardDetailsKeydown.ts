import { useEffect } from "react"

type UseBoardDetailsKeydownProps = {
  handlePlayPause: () => void
  handleSkipBack: () => void
  handleSkipForward: () => void
  setPlaybackRate: (up: boolean) => void
}

export function useBoardDetailsKeydown({
  handlePlayPause,
  handleSkipBack,
  handleSkipForward,
  setPlaybackRate,
}: UseBoardDetailsKeydownProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const isEditableTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable

      if (isEditableTarget) return

      if (event.key === "ArrowLeft") {
        event.preventDefault()
        event.stopPropagation()
        handleSkipBack()
        return
      }
      if (event.key === "ArrowRight") {
        event.preventDefault()
        event.stopPropagation()
        handleSkipForward()
        return
      }
      if (event.key === "ArrowUp") {
        event.preventDefault()
        event.stopPropagation()
        setPlaybackRate(true)
        return
      }
      if (event.key === "ArrowDown") {
        event.preventDefault()
        event.stopPropagation()
        setPlaybackRate(false)
        return
      }
      if (event.key === " " || event.code === "Space") {
        event.preventDefault()
        event.stopPropagation()
        handlePlayPause()
      }
    }

    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [handlePlayPause, handleSkipBack, handleSkipForward, setPlaybackRate])
}