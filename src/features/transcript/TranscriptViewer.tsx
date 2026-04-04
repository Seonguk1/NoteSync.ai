// src/features/transcript/TranscriptViewer.tsx

import { useEffect, useMemo, useRef } from "react";
import { Loader2, MessageSquareText, PanelRightClose } from "lucide-react";
import { getTranscripts } from "../../api/content";
import { useAppStore } from "../../store/useAppStore";

const formatTime = (seconds: number) => {
  if (Number.isNaN(seconds)) return "00:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

type TranscriptViewerProps = {
  collapsed?: boolean;
  onToggle?: () => void;
};

export const TranscriptViewer = ({
  collapsed = false,
  onToggle,
}: TranscriptViewerProps) => {
  const playingMaterial = useAppStore((state) => state.playingMaterial);
  const transcripts = useAppStore((state) => state.transcripts);
  const isTranscriptLoading = useAppStore((state) => state.isTranscriptLoading);
  const currentTime = useAppStore((state) => state.currentTime);

  const setTranscripts = useAppStore((state) => state.setTranscripts);
  const setIsTranscriptLoading = useAppStore((state) => state.setIsTranscriptLoading);
  const seekTo = useAppStore((state) => state.seekTo);

  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const prevCollapsedRef = useRef<boolean>(collapsed);

  useEffect(() => {
    if (!playingMaterial || (playingMaterial.type !== "audio" && playingMaterial.type !== "video")) {
      setTranscripts([]);
      setIsTranscriptLoading(false);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      try {
        setIsTranscriptLoading(true);
        const data = await getTranscripts(playingMaterial.id);
        if (!cancelled) {
          setTranscripts(data);
        }
      } catch (error) {
        console.error("자막 불러오기 실패:", error);
        if (!cancelled) {
          setTranscripts([]);
        }
      } finally {
        if (!cancelled) {
          setIsTranscriptLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [playingMaterial?.id, playingMaterial?.type, setIsTranscriptLoading, setTranscripts]);

  const activeIndex = useMemo(() => {
    return transcripts.findIndex(
      (item) => currentTime >= item.start_time && currentTime < item.end_time
    );
  }, [transcripts, currentTime]);

  useEffect(() => {
    if (activeIndex < 0 || collapsed) return;

    const activeItem = transcripts[activeIndex];
    if (!activeItem) return;

    const node = itemRefs.current[activeItem.id];
    if (!node) return;

    node.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeIndex, transcripts, collapsed]);

  // 사이드바가 접혀 있다가 펼쳐질 때 포커싱된 항목이 중앙에 오도록 보정
  useEffect(() => {
    // 이전 상태가 collapsed였고 지금은 펼쳐진 경우에만 처리
    if (prevCollapsedRef.current && !collapsed) {
      if (activeIndex < 0) {
        prevCollapsedRef.current = collapsed;
        return;
      }

      const activeItem = transcripts[activeIndex];
      if (!activeItem) {
        prevCollapsedRef.current = collapsed;
        return;
      }

      const node = itemRefs.current[activeItem.id];
      if (!node) {
        prevCollapsedRef.current = collapsed;
        return;
      }

      // 패널 확장 애니메이션/레이아웃 안정화를 기다린 뒤 스크롤
      requestAnimationFrame(() => {
        setTimeout(() => {
          node.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
      });
    }

    prevCollapsedRef.current = collapsed;
  }, [collapsed, activeIndex, transcripts]);

  if (!playingMaterial) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center text-gray-400">
        <MessageSquareText className="mb-3 h-8 w-8 opacity-30" />
        <p className="text-sm font-medium">재생 중인 미디어가 없습니다</p>
        <p className="mt-1 text-xs">오디오나 영상을 선택하면 자막이 표시됩니다</p>
      </div>
    );
  }

  if (isTranscriptLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center text-gray-400">
        <Loader2 className="mb-3 h-8 w-8 animate-spin opacity-50" />
        <p className="text-sm font-medium">자막을 불러오는 중...</p>
      </div>
    );
  }

  if (transcripts.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center text-gray-400">
        <MessageSquareText className="mb-3 h-8 w-8 opacity-30" />
        <p className="text-sm font-medium">표시할 자막이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <p className="truncate text-sm font-semibold text-gray-700">
            {playingMaterial.original_name}
          </p>
          <p className="mt-1 text-xs text-gray-400">클릭하면 해당 시점으로 이동합니다</p>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label={collapsed ? "스크립트 패널 펼치기" : "스크립트 패널 접기"}
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {transcripts.map((item) => {
            const isActive =
              currentTime >= item.start_time && currentTime < item.end_time;

            return (
              <div
                key={item.id}
                ref={(node) => {
                  itemRefs.current[item.id] = node;
                }}
                onClick={() => seekTo(item.start_time)}
                className={`cursor-pointer rounded-xl border px-3 py-2 transition-all ${isActive
                  ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-transparent bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50"
                  }`}
              >
                <div className="mb-1 text-[11px] font-semibold text-gray-400">
                  {formatTime(item.start_time)}
                </div>
                <div className="text-sm leading-6">{item.content}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};