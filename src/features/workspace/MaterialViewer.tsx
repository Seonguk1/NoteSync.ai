// src/features/workspace/MaterialViewer.tsx

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePolling } from "../../hooks/usePolling";
import { getMaterials } from "../../api/content";
import {
  FileText,
  Loader2,
  PlayCircle,
  TriangleAlert,
  Volume2,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { PdfViewer } from "./components/PdfViewer";
import { MediaViewer } from "./components/MediaViewer";
import { TranscriptOverlay } from "../transcript/components/TranscriptOverlay";

const BACKEND_BASE_URL = "http://127.0.0.1:8000";

export const MaterialViewer = () => {
  const viewingMaterial = useAppStore((state) => state.viewingMaterial);
  const playingMaterial = useAppStore((state) => state.playingMaterial);
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const setViewingMaterial = useAppStore((state) => state.setViewingMaterial);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewerWidth, setViewerWidth] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateWidth = () => {
      setViewerWidth(node.clientWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  const viewingFileUrl = viewingMaterial?.file_url
    ? `${BACKEND_BASE_URL}${viewingMaterial.file_url}`
    : "";

  const playingFileUrl = playingMaterial?.file_url
    ? `${BACKEND_BASE_URL}${playingMaterial.file_url}`
    : "";

  const showVideoLayer =
    !!playingMaterial &&
    playingMaterial.type === "video" &&
    viewingMaterial?.type === "video" &&
    viewingMaterial.id === playingMaterial.id;

  const renderContent = () => {
    if (!viewingMaterial && !playingMaterial) {
      return (
        <CenteredState
          icon={<PlayCircle className="h-12 w-12 opacity-30" />}
          title="좌측 사이드바에서 학습할 자료를 선택해주세요"
          description=""
          subtle
        />
      );
    }
    
    if (viewingMaterial?.status === "PROCESSING") {
      return (
        <CenteredState
          icon={<Loader2 className="h-10 w-10 animate-spin opacity-50" />}
          title="자료를 처리하는 중입니다"
          description="텍스트 추출 또는 자막 생성이 완료되면 사용할 수 있습니다."
        />
      );
    }

    if (viewingMaterial?.status === "FAILED") {
      return (
        <CenteredState
          icon={<TriangleAlert className="h-10 w-10 opacity-50" />}
          title="자료 처리에 실패했습니다"
          description="다시 업로드하거나 다른 자료를 선택해주세요."
          danger
        />
      );
    }

    return (
      <>
        {playingMaterial && (
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${
              showVideoLayer ? "z-20 opacity-100" : "pointer-events-none z-0 opacity-0"
            }`}
          >
            <MediaViewer
              fileUrl={playingFileUrl}
              type={playingMaterial.type}
              visible={showVideoLayer}
            />
          </div>
        )}

        {viewingMaterial?.type === "pdf" && (
          <div className="absolute inset-0 z-30 bg-gray-100">
            <PdfViewer fileUrl={viewingFileUrl} viewerWidth={viewerWidth} materialId={viewingMaterial?.id} />
          </div>
        )}

        {viewingMaterial?.type === "note" && (
          <CenteredState
            icon={<FileText className="h-10 w-10 opacity-40" />}
            title="노트가 선택되었습니다"
            description="우측 메모 영역에서 내용을 편집하세요."
          />
        )}

        {(viewingMaterial?.type === "audio" ||
          (!viewingMaterial && playingMaterial?.type === "audio")) && (
          <CenteredState
            icon={<Volume2 className="h-10 w-10 opacity-40" />}
            title="오디오가 재생 중입니다"
            description="하단 플레이어와 우측 자막 패널로 학습을 이어가세요."
            dark
          />
        )}

        <TranscriptOverlay />
      </>
    );
  };

  // Poll for updates when the currently viewed material is processing
  const refreshViewingMaterial = async () => {
    if (!viewingMaterial || !currentSessionId) return;

    try {
      const materials = await getMaterials(currentSessionId);
      const found = materials.find((m) => m.id === viewingMaterial.id) ?? null;
      if (found) {
        setViewingMaterial(found);
      }
    } catch (err) {
      console.error("refreshViewingMaterial error:", err);
    }
  };

  usePolling(refreshViewingMaterial, viewingMaterial?.status === "PROCESSING", 3000);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-black"
    >
      {renderContent()}
    </div>
  );
};

type CenteredStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  danger?: boolean;
  dark?: boolean;
  subtle?: boolean;
};

const CenteredState = ({
  icon,
  title,
  description,
  danger = false,
  dark = false,
  subtle = false,
}: CenteredStateProps) => {
  const baseClass = dark
    ? "bg-gray-950 text-gray-300"
    : danger
    ? "bg-red-50 text-red-500"
    : subtle
    ? "bg-gray-50/50 text-gray-400"
    : "bg-white text-gray-500";

  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center px-8 text-center ${baseClass}`}
    >
      <div className="mb-4">{icon}</div>
      <p className="text-base font-semibold">{title}</p>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-6 opacity-80">
          {description}
        </p>
      ) : null}
    </div>
  );
};