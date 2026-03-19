# PDCA Design: UI-BoardDetails (Final - Backend Slicing)

## 1. 요구사항 분석 및 아키텍처 재정립
- **목표**: 대용량 PDF 업로드 시 사용자가 지정한 페이지 범위(예: 100~130p)만 시스템에서 효율적으로 처리하고 렌더링.
- **프론트엔드 성능 이슈(문제 제기)**: 500페이지 원본을 브라우저가 통째로 다운로드한 뒤 `react-pdf`로 부분 렌더링하는 방식은 네트워크 비용 증가와 브라우저 메모리 고갈(OOM) 위험을 초래함.
- **최종 아키텍처 (Backend Slicing)**:
  1. **[Upload]**: 프론트엔드에서 업로드 시 `start_page`, `end_page` 파라미터를 추가 전송.
  2. **[Backend]**: FastAPI 파일 업로드 핸들러에서 `pypdf`를 사용해 **해당 페이지만 추출(Slicing)하여 새로운(가벼운) PDF 파일로 저장**. (이후 AI 파이프라인도 이 가벼운 파일로 진행)
  3. **[Frontend]**: 프론트엔드는 슬라이싱된 가벼운 PDF(예: 30페이지 분량)의 URL만 응답받아, 복잡한 페이지 필터링 로직 없이 `1`페이지부터 끝까지 렌더링.
  4. **[Rendering Opt]**: `react-pdf` 렌더링 시 **Intersection Observer (가상화)**를 적용하여 화면에 보이는 `<Page />`만 렌더링.

이 방식은 백엔드 스토리지 비용을 약간 증가시킬 수 있으나, 네트워크 대역폭( egress 비용), 프론트엔드 성능, AI 파이프라인 속도 등 모든 면에서 압도적으로 유리한 구조입니다. **완벽하게 동의합니다.**

## 2. 백엔드 슬라이싱 설계 (Core-API 연계)

### 2.1 API Contract 변경 (`docs/api-contract.md`)
- `POST /boards/upload` 요청(Multipart)에 필드 추가.
  - `pdf_start_page`: int (optional)
  - `pdf_end_page`: int (optional)

### 2.2 Slicing 로직 (`app/services/ai_pipeline.py` 또는 `upload` 라우터)
- `pypdf.PdfWriter`와 `pypdf.PdfReader`를 조합하여 원본을 읽고 지정 범위의 페이지만 꺼내 새 파일로 Write.
- (본 설계 문서는 UI 중심이므로 프론트엔드 작업에 집중하고, 백엔드는 Slicing 로직이 완료되었다고 가정하고 렌더링 측면만 다룹니다.)

## 3. 프론트엔드 뷰어 설계 (`react-pdf` + Virtualization)

### 3.1 인터페이스 (`types.ts`)
- 백엔드에서 주는 파일 자체가 이미 잘린(Slicing) 파일이므로, `startPage`, `endPage` 정보는 뷰어 렌더링에 필요 없어집니다. (매우 깔끔해짐)

```typescript
export interface BoardPdf {
  url: string;
  mimeType: string;
}
// BoardDetail에는 기존처럼 pdf: BoardPdf | null 로만 유지.
```

### 3.2 `PdfViewer.tsx` 설계 (Intersection Observer)
- **가상화 렌더링**: 30페이지만 되어도 한 번에 Canvas로 그리면 스크롤이 버벅일 수 있습니다.
- `react-intersection-observer` (또는 네이티브 API)를 사용하여, `<div className="pdf-page-container">`가 화면(Viewport)에 들어왔을 때만 `<Page />` 컴포넌트를 마운트.

```tsx
// PdfViewer.tsx 구조
import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useInView } from 'react-intersection-observer';
import { useResizeDetector } from 'react-resize-detector';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Vite 환경 통합 가이드에 따른 로컬 워커 설정 (CDN 미사용)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

function VirtualizedPage({ pageNumber, containerWidth }: { pageNumber: number, containerWidth: number }) {
  const { ref, inView } = useInView({
    triggerOnce: false, // 뷰포트 벗어나면 언마운트하여 메모리 최적화
    rootMargin: '400px 0px', // 화면 위아래로 여유를 두고 미리 렌더링
  });

  // 스크롤 점핑 방지를 위해 A4 비율(1:1.414) 적용 혹은 실제 페이지 비율 기반 계산 (Aspect Ratio 유지)
  const estimatedHeight = containerWidth * 1.414;

  return (
    <div ref={ref} className="mb-4 bg-white shadow-md flex justify-center" style={{ minHeight: `${estimatedHeight}px` }}>
      {inView ? (
        <Page pageNumber={pageNumber} width={containerWidth} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50 skeleton-box">
          Loading Page {pageNumber}... (Skeleton)
        </div>
      )}
    </div>
  );
}

export function PdfViewer({ pdfUrl }: { pdfUrl: string }) {
  const [numPages, setNumPages] = useState<number>();
  const { width: containerWidth, ref: containerRef } = useResizeDetector();

  return (
    <div ref={containerRef} className="h-full w-full overflow-y-auto bg-slate-200 p-4 relative">
      <Document
        file={pdfUrl}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={<p>PDF 로딩 중...</p>}
      >
        {containerWidth && Array.from(new Array(numPages), (el, index) => (
          <VirtualizedPage 
            key={`page_${index + 1}`} 
            pageNumber={index + 1} 
            containerWidth={containerWidth} 
          />
        ))}
      </Document>
    </div>
  );
}
```

### 3.3 `MediaStage.tsx`
- 백엔드 Slicing 덕분에 `pdfUrl`만 넘겨주면 끝납니다. 매우 단순합니다.

## 4. 요약 및 Action Items
"백엔드 Slicing -> 프론트엔드 가상화 렌더링" 조합은 성능, 비용, 코드 복잡도 모든 면에서 가장 우수한 Best Practice입니다. 제안에 100% 동의하며 이 구조로 최종 확정합니다.

1. [ ] 프론트엔드: `npm install react-pdf react-intersection-observer`
2. [ ] 프론트엔드: `PdfViewer.tsx` (Intersection Observer 적용) 구현.
3. [ ] 프론트엔드: `MediaStage` 연동 (Types 등 갱신 불필요. 잘린 PDF URL만 전달).
4. [ ] 백엔드 (다음 단계): 업로드 API에서 Start/End 파라미터 수신 및 `pypdf`를 이용한 슬라이싱(Slicing) 로직 구현. (업로드 UI 기능 개발 시 연계)