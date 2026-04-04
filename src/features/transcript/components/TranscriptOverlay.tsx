// src/features/transcript/components/TranscriptOverlay.tsx

import { useMemo } from "react";
import { useAppStore } from "../../../store/useAppStore";

export const TranscriptOverlay = () => {
  const playingMaterial = useAppStore((state) => state.playingMaterial);
  const transcripts = useAppStore((state) => state.transcripts);
  const currentTime = useAppStore((state) => state.currentTime);

  const subtitlePosition = useAppStore((state) => state.subtitlePosition ?? "bottom");

  const currentTranscript = useMemo(() => {
    if (!playingMaterial) return null;

    return (
      transcripts.find(
        (item) =>
          currentTime >= item.start_time && currentTime < item.end_time
      ) ?? null
    );
  }, [playingMaterial, transcripts, currentTime]);

  if (!playingMaterial || !currentTranscript) return null;

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 ${
        subtitlePosition === "bottom" ? "bottom-8" : "top-8"
      } z-40 flex justify-center px-4 transcript-overlay`}
    >
      <div className="w-[82%] min-w-[280px] max-w-[1500px] rounded-2xl bg-black/70 px-5 py-3 text-center text-2xl font-medium leading-relaxed text-white shadow-2xl backdrop-blur-md">
        {currentTranscript.content}
      </div>
    </div>
  );
};