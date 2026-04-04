// src/features/workspace/components/MediaViewer.tsx

import { useEffect, useRef } from "react";
import { useAppStore } from "../../../store/useAppStore";

type MediaViewerProps = {
  fileUrl: string;
  type: "pdf" | "audio" | "video" | "note";
  visible?: boolean;
};

export const MediaViewer = ({
  fileUrl,
  type,
  visible = false,
}: MediaViewerProps) => {
  const mediaRef = useRef<HTMLMediaElement | null>(null);

  const playingMaterial = useAppStore((state) => state.playingMaterial);
  const isPlaying = useAppStore((state) => state.isPlaying);
  const playbackRate = useAppStore((state) => state.playbackRate);

  const setMediaElement = useAppStore((state) => state.setMediaElement);
  const setCurrentTime = useAppStore((state) => state.setCurrentTime);
  const setDuration = useAppStore((state) => state.setDuration);
  const setIsPlaying = useAppStore((state) => state.setIsPlaying);
  const resetPlaybackState = useAppStore((state) => state.resetPlaybackState);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    setMediaElement(media);

    const handleTimeUpdate = () => {
      setCurrentTime(media.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(media.duration || 0);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    media.addEventListener("timeupdate", handleTimeUpdate);
    media.addEventListener("loadedmetadata", handleLoadedMetadata);
    media.addEventListener("play", handlePlay);
    media.addEventListener("pause", handlePause);
    media.addEventListener("ended", handleEnded);

    return () => {
      media.removeEventListener("timeupdate", handleTimeUpdate);
      media.removeEventListener("loadedmetadata", handleLoadedMetadata);
      media.removeEventListener("play", handlePlay);
      media.removeEventListener("pause", handlePause);
      media.removeEventListener("ended", handleEnded);
      setMediaElement(null);
    };
  }, [setMediaElement, setCurrentTime, setDuration, setIsPlaying]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || !playingMaterial || !fileUrl) return;

    media.src = fileUrl;
    media.load();
    resetPlaybackState();
  }, [playingMaterial?.id, fileUrl, resetPlaybackState]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    media.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || !playingMaterial) return;

    if (isPlaying) {
      media.play().catch((error) => {
        console.error("미디어 재생 실패:", error);
        setIsPlaying(false);
      });
    } else {
      media.pause();
    }
  }, [isPlaying, playingMaterial?.id, setIsPlaying]);

  if (type === "audio") {
    return <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} preload="metadata" className="hidden" />;
  }

  return (
    <video
      ref={mediaRef as React.RefObject<HTMLVideoElement>}
      preload="metadata"
      className={`h-full w-full object-contain ${visible ? "block" : "hidden"}`}
      controls={false}
      playsInline
    />
  );
};