// src/features/workspace/components/PdfViewer.tsx

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { pdfjs, Document, Page } from "react-pdf";
import AnnotationLayer from "./AnnotationLayer";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

type PdfViewerProps = {
  fileUrl: string;
  viewerWidth: number;
  materialId?: number | null;
  // 휠 기반 페이지 전환을 활성화할지 여부 (기본: true)
  scrollPaging?: boolean;
  // 휠 누적 델타 임계값 
  wheelThreshold?: number;
  // 페이지 전환 후 쿨다운
  wheelCooldown?: number;
};

export const PdfViewer = ({
  fileUrl,
  viewerWidth,
  materialId = null,
  scrollPaging = true,
  wheelThreshold = 100,
  wheelCooldown = 200,
}: PdfViewerProps) => {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  const [isEditingPage, setIsEditingPage] = useState(false);
  const [pageInput, setPageInput] = useState("");

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setIsEditingPage(false);
    setPageInput("");
  };

  useEffect(() => {
    if (isEditingPage) {
      setPageInput(String(pageNumber));
    }
  }, [isEditingPage, pageNumber]);

  const clampedPage = (value: number) => {
    if (!numPages) return 1;
    return Math.max(1, Math.min(numPages, value));
  };

  const commitPageInput = () => {
    const parsed = Number(pageInput);

    if (!Number.isFinite(parsed)) {
      setIsEditingPage(false);
      setPageInput(String(pageNumber));
      return;
    }

    setPageNumber(clampedPage(Math.floor(parsed)));
    setIsEditingPage(false);
  };

  const pageWidth = useMemo(() => {
    if (!viewerWidth) return undefined;

    // 패널 padding, 내부 여백 고려
    const fitted = Math.max(120, viewerWidth - 48);
    return fitted;
  }, [viewerWidth]);

  // PDF 컨테이너와 휠 관련 상태를 위한 ref
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wheelAccumRef = useRef(0);
  const lastDirectionRef = useRef<number | null>(null);
  const throttleRef = useRef(false);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 페이지 전환 후 컨테이너 스크롤을 맨 위로 초기화
  useEffect(() => {
    const container = containerRef.current;
    if (container) container.scrollTop = 0;
    wheelAccumRef.current = 0;
    lastDirectionRef.current = null;
  }, [pageNumber]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
    };
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!scrollPaging || !numPages) return;

    const delta = e.deltaY;
    if (delta === 0) return;

    const container = containerRef.current;

    // 컨테이너 내부에서 스크롤 가능한 영역이 있고, 아직 상단/하단에 닿지 않았다면 내부 스크롤 허용
    if (container) {
      const isScrollable = container.scrollHeight > container.clientHeight + 1;
      const atTop = container.scrollTop <= 0;
      const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 1;
      if (isScrollable && !((atTop && delta < 0) || (atBottom && delta > 0))) {
        return; // 내부 스크롤 우선
      }
    }

    // 쿨다운 중일 때: 경계(첫/마지막 페이지)로의 스크롤은 부모로 버블링 허용
    if (throttleRef.current) {
      const atFirst = pageNumber <= 1;
      const atLast = pageNumber >= (numPages ?? 1);
      if ((atFirst && delta < 0) || (atLast && delta > 0)) {
        return; // 부모로 버블링
      }
      // 나머지 경우엔 무시(부모 스크롤 차단)
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const direction = delta > 0 ? 1 : -1;
    if (lastDirectionRef.current !== null && direction !== lastDirectionRef.current) {
      wheelAccumRef.current = 0; // 방향 전환 시 누적값 초기화
    }
    lastDirectionRef.current = direction;
    wheelAccumRef.current += delta;

    const atFirst = pageNumber <= 1;
    const atLast = pageNumber >= (numPages ?? 1);

    // 임계값 도달 시 페이지 전환
    if (Math.abs(wheelAccumRef.current) >= wheelThreshold) {
      let handled = false;
      if (wheelAccumRef.current > 0 && !atLast) {
        setPageNumber((prev) => Math.min(numPages ?? 1, prev + 1));
        handled = true;
      } else if (wheelAccumRef.current < 0 && !atFirst) {
        setPageNumber((prev) => Math.max(1, prev - 1));
        handled = true;
      }

      wheelAccumRef.current = 0;

      if (handled) {
        // 페이지 전환을 처리했으므로 이벤트 캡처(부모 스크롤 방지)
        e.preventDefault();
        e.stopPropagation();

        // 짧은 쿨다운 설정으로 빠른 연속 스크롤에서 여러 페이지 점프 방지
        throttleRef.current = true;
        if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = setTimeout(() => {
          throttleRef.current = false;
          throttleTimerRef.current = null;
        }, wheelCooldown);
      }
    }
  }, [scrollPaging, numPages, pageNumber, wheelThreshold, wheelCooldown]);

  // 네이티브 wheel 이벤트를 passive:false 옵션으로 등록하여
  // 핸들러에서 e.preventDefault()가 동작하도록 보장합니다.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const listener = (ev: Event) => {
      // ev는 DOM WheelEvent입니다.
      handleWheel(ev as WheelEvent);
    };

    el.addEventListener("wheel", listener as EventListener, { passive: false });
    return () => el.removeEventListener("wheel", listener as EventListener);
  }, [handleWheel]);

  return (
    <div className="flex h-full flex-col bg-gray-100/50">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white p-2 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
            disabled={pageNumber <= 1}
            className="rounded p-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex min-w-[88px] items-center justify-center text-sm font-medium text-gray-600">
            {isEditingPage ? (
              <input
                autoFocus
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ""))}
                onBlur={commitPageInput}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    commitPageInput();
                  }
                  if (e.key === "Escape") {
                    setIsEditingPage(false);
                    setPageInput(String(pageNumber));
                  }
                }}
                className="w-10 rounded border border-gray-300 px-1 py-0.5 text-center outline-none focus:border-blue-400"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingPage(true)}
                className="rounded px-1 py-0.5 hover:bg-gray-100"
                title="페이지 번호 직접 입력"
              >
                {pageNumber}
              </button>
            )}

            <span className="mx-1 text-gray-400">/</span>
            <span>{numPages ?? "?"}</span>
          </div>

          <button
            type="button"
            onClick={() => setPageNumber((prev) => Math.min(numPages ?? 1, prev + 1))}
            disabled={!numPages || pageNumber >= numPages}
            className="rounded p-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScale((prev) => Math.max(0.5, prev - 0.2))}
            disabled={scale <= 0.5}
            className="rounded p-1 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          <span className="w-12 text-center font-mono text-xs text-gray-500">
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            onClick={() => setScale((prev) => Math.min(3.0, prev + 0.2))}
            disabled={scale >= 3.0}
            className="rounded p-1 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="custom-scrollbar flex flex-1 justify-center overflow-auto p-4"
      >
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(error) => {
            console.error("PDF load error:", error);
          }}
          loading={<div className="mt-10 text-sm text-gray-400">PDF를 불러오는 중...</div>}
          error={<div className="mt-10 text-sm text-red-500">PDF를 불러오지 못했습니다.</div>}
          noData={<div className="mt-10 text-sm text-gray-400">PDF 파일이 없습니다.</div>}
          className="drop-shadow-lg"
        >
            <div className="relative inline-block">
              <Page
                pageNumber={pageNumber}
                width={pageWidth}
                scale={scale}
                renderTextLayer
                renderAnnotationLayer
                loading={<div className="text-sm text-gray-400">페이지를 불러오는 중...</div>}
                error={<div className="text-sm text-red-500">페이지를 렌더링하지 못했습니다.</div>}
                noData={<div className="text-sm text-gray-400">표시할 페이지가 없습니다.</div>}
              />

              {materialId ? (
                <AnnotationLayer materialId={materialId} pageNumber={pageNumber} scale={scale} />
              ) : null}
            </div>
        </Document>
      </div>
    </div>
  );
};