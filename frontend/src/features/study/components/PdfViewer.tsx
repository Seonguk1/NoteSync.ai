import { useState } from "react"
import { useInView } from "react-intersection-observer"
import { Document, Page, pdfjs } from "react-pdf"
import { useResizeDetector } from "react-resize-detector"

import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

// Vite 환경에서 로컬 워커를 사용하도록 설정 (CDN 사용 안 함)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

interface VirtualizedPageProps {
  pageNumber: number
  containerWidth: number
}

function VirtualizedPage({ pageNumber, containerWidth }: VirtualizedPageProps) {
  const { ref, inView } = useInView({
    triggerOnce: false, // 뷰포트에서 벗어나면 언마운트하여 메모리 확보
    rootMargin: "400px 0px", // 상하 400px 여유를 두고 렌더링 시작/해제
  })

  // 스크롤 점핑 방지를 위해 A4 비율(1:1.414) 적용 (Aspect Ratio 유지)
  const estimatedHeight = containerWidth * 1.414

  return (
    <div
      className="mb-6 flex justify-center bg-white shadow-[var(--shadow-soft)]"
      ref={ref}
      style={{ minHeight: `${estimatedHeight}px` }}
    >
      {inView ? (
        <Page
          className="bg-white"
          pageNumber={pageNumber}
          renderAnnotationLayer={false}
          renderTextLayer={true} // 드래그/복사를 위해 텍스트 레이어 활성화
          width={containerWidth} // 부모 너비에 맞게 반응형 조절
        />
      ) : (
        <div className="flex w-full items-center justify-center bg-white text-[var(--color-text-muted)]">
          <span className="animate-pulse">Loading Page {pageNumber}...</span>
        </div>
      )}
    </div>
  )
}

interface PdfViewerProps {
  pdfUrl: string
}

export function PdfViewer({ pdfUrl }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>()
  const { width, ref: containerRef } = useResizeDetector()
  
  // 패딩(양옆 32px씩 총 64px)을 고려한 실제 페이지 너비
  const containerWidth = width ? Math.max(width - 64, 300) : 0

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-200/50 p-8" ref={containerRef}>
      <div className="mx-auto flex flex-col items-center">
        <Document
          file={pdfUrl}
          loading={
            <div className="flex h-full w-full items-center justify-center text-[var(--color-text-muted)]">
              PDF 문서를 불러오는 중입니다...
            </div>
          }
          onLoadSuccess={onDocumentLoadSuccess}
        >
          {numPages && containerWidth > 0
            ? Array.from(new Array(numPages), (_, index) => (
                <VirtualizedPage
                  containerWidth={containerWidth}
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                />
              ))
            : null}
        </Document>
      </div>
    </div>
  )
}

