// src/features/player/BottomPlayer.tsx

import {
  Gauge,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";

const formatTime = (seconds: number) => {
  if (!seconds || Number.isNaN(seconds)) return "00:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

export const BottomPlayer = () => {
  const playingMaterial = useAppStore((state) => state.playingMaterial);
  const currentTime = useAppStore((state) => state.currentTime);
  const duration = useAppStore((state) => state.duration);
  const isPlaying = useAppStore((state) => state.isPlaying);
  const playbackRate = useAppStore((state) => state.playbackRate);

  const seekTo = useAppStore((state) => state.seekTo);
  const skipBy = useAppStore((state) => state.skipBy);
  const togglePlayPause = useAppStore((state) => state.togglePlayPause);

  const disabled = !playingMaterial;

  return (
    <footer className="h-20 shrink-0 border-t border-gray-200 bg-white px-4">
      <div className="flex h-full items-center gap-4">
        <div className="flex min-w-0 w-64 items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
            {playingMaterial ? (
              <Play className="h-5 w-5" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-800">
              {playingMaterial ? playingMaterial.original_name : "No media selected"}
            </p>
            <p className="truncate text-xs text-gray-400">
              {playingMaterial ? playingMaterial.type.toUpperCase() : "Waiting for input..."}
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <div className={`flex items-center gap-4 ${disabled ? "text-gray-300" : "text-gray-500"}`}>
            <button
              type="button"
              onClick={() => skipBy(-5)}
              disabled={disabled}
              className="rounded-full p-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={togglePlayPause}
              disabled={disabled}
              className="rounded-full bg-slate-100 p-3 text-gray-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => skipBy(5)}
              disabled={disabled}
              className="rounded-full p-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          </div>

          <div className="flex w-full max-w-3xl items-center gap-3">
            <span className="w-10 text-xs text-gray-400">{formatTime(currentTime)}</span>

            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={(e) => seekTo(Number(e.target.value))}
              disabled={disabled}
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            />

            <span className="w-10 text-right text-xs text-gray-400">{formatTime(duration)}</span>
          </div>
        </div>

        <div className={`flex w-48 items-center justify-end gap-3 ${disabled ? "text-gray-300" : "text-gray-500"}`}>
          <button type="button" disabled={disabled} className="rounded-full p-2 hover:bg-gray-100 disabled:opacity-50">
            <Gauge className="h-4 w-4" />
          </button>

          <span className="w-10 text-center text-sm">{playbackRate.toFixed(2).replace(/\.00$/, "")}x</span>

          <button type="button" disabled={disabled} className="rounded-full p-2 hover:bg-gray-100 disabled:opacity-50">
            <Volume2 className="h-4 w-4" />
          </button>

          <button type="button" disabled={disabled} className="rounded-full p-2 hover:bg-gray-100 disabled:opacity-50">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </footer>
  );
};