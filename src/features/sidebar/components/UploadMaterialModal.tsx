import { useEffect, useMemo, useState, useRef } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { uploadMaterials } from "../../../api/content";

type UploadMaterialModalProps = {
  open: boolean;
  sessionId: number | null;
  onClose: () => void;
  onUploaded?: () => void;
};

export const UploadMaterialModal = ({
  open,
  sessionId,
  onClose,
  onUploaded,
}: UploadMaterialModalProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [isGlobalDragActive, setIsGlobalDragActive] = useState(false);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    if (!open) {
      setSelectedFiles([]);
      setIsUploading(false);
      setErrorMessage("");
      setIsDragActive(false);
    }
  }, [open]);

  const acceptedExtensions = useMemo(
    () => ".pdf,.mp3,.m4a,.wav,.mp4,.mkv,.avi",
    []
  );

  const handleClose = () => {
    if (isUploading) return;
    onClose();
  };

  // ESC 키로 닫기 처리 (훅 호출 순서를 보장하기 위해 early return 위에 둠)
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isUploading]);

  // 전역 drag/drop 기본 동작 차단 및 디버그 로깅
  useEffect(() => {
    if (!open) return;
    const onWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      try {
        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      } catch {}
    };
    const onWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      console.log("UploadModal: window drop", (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) || 0);
    };

    window.addEventListener("dragover", onWindowDragOver);
    window.addEventListener("drop", onWindowDrop);
    return () => {
      window.removeEventListener("dragover", onWindowDragOver);
      window.removeEventListener("drop", onWindowDrop);
    };
  }, [open]);

  // 문서 전체 드래그/드롭 리스너: 드래그가 화면 어디서든 시작되는지 확인
  useEffect(() => {
    if (!open) return;
    const onDocDragEnter = (e: Event) => {
      try {
        e.preventDefault();
      } catch {}
      dragCounterRef.current += 1;
      setIsGlobalDragActive(true);
      console.log("UploadModal: doc dragenter", dragCounterRef.current);
    };
    const onDocDragLeave = (e: Event) => {
      try {
        e.preventDefault();
      } catch {}
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsGlobalDragActive(false);
      }
      console.log("UploadModal: doc dragleave", dragCounterRef.current);
    };
    const onDocDragOver = (e: Event) => {
      try {
        e.preventDefault();
        // @ts-ignore
        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      } catch {}
    };
    const onDocDrop = (e: Event) => {
      try {
        e.preventDefault();
      } catch {}
      console.log("UploadModal: doc drop");
      dragCounterRef.current = 0;
      setIsGlobalDragActive(false);
    };

    document.addEventListener("dragenter", onDocDragEnter);
    document.addEventListener("dragleave", onDocDragLeave);
    document.addEventListener("dragover", onDocDragOver);
    document.addEventListener("drop", onDocDrop);

    return () => {
      document.removeEventListener("dragenter", onDocDragEnter);
      document.removeEventListener("dragleave", onDocDragLeave);
      document.removeEventListener("dragover", onDocDragOver);
      document.removeEventListener("drop", onDocDrop);
    };
  }, [open]);

  // 열릴 때 디버그 로그
  useEffect(() => {
    if (open) console.log("UploadMaterialModal opened - debug badge v1");
  }, [open]);

  if (!open) return null;

  const handleUpload = async () => {
    if (!sessionId) {
      setErrorMessage("세션이 선택되지 않았습니다.");
      return;
    }

    if (!selectedFiles || selectedFiles.length === 0) {
      setErrorMessage("업로드할 파일을 선택해주세요.");
      return;
    }

    try {
      setIsUploading(true);
      setErrorMessage("");

      await uploadMaterials(sessionId, selectedFiles);

      onUploaded?.();
      onClose();
    } catch (error) {
      console.error("파일 업로드 실패:", error);
      setErrorMessage("파일 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        try {
          // @ts-ignore - dataTransfer may not exist on all event types in TS inference
          if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
        } catch {}
      }}
      onDrop={(e) => {
        e.preventDefault();
        try {
          // @ts-ignore
          console.log("UploadModal: overlay drop", (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) || 0);
        } catch {}
      }}
    >
      {isGlobalDragActive && (
        <div className="fixed inset-0 z-[115] flex items-center justify-center pointer-events-none">
          <div className="rounded-lg bg-white/90 border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700">
            파일을 놓으면 업로드됩니다 (글로벌)
          </div>
        </div>
      )}
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-gray-400">
              UPLOAD
            </p>
            <h2 className="text-base font-semibold text-gray-800">
              자료 업로드
            </h2>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div
            className={`relative rounded-xl border border-dashed p-4 ${isDragActive ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50"}`}
            onDragEnter={(e: ReactDragEvent<HTMLDivElement>) => {
              e.preventDefault();
              e.stopPropagation();
              if (isUploading) return;
              console.log("UploadModal: dragenter", e.dataTransfer?.types);
              setIsDragActive(true);
            }}
            onDragOver={(e: ReactDragEvent<HTMLDivElement>) => {
              e.preventDefault();
              e.stopPropagation();
              if (isUploading) return;
              // 명시적으로 드롭 허용
              try {
                if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
              } catch {}
              console.log("UploadModal: dragover", e.dataTransfer?.types);
              setIsDragActive(true);
            }}
            onDragLeave={(e: ReactDragEvent<HTMLDivElement>) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("UploadModal: dragleave");
              setIsDragActive(false);
            }}
            onDrop={(e: ReactDragEvent<HTMLDivElement>) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("UploadModal: drop", e.dataTransfer?.files?.length);
              if (isUploading) return;
              const files = e.dataTransfer?.files ? (Array.from(e.dataTransfer.files) as File[]) : [];
              if (files.length > 0) {
                setSelectedFiles((prev) => [...prev, ...files]);
                setErrorMessage("");
              }
              setIsDragActive(false);
            }}
          >
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${isDragActive ? "bg-blue-100 text-blue-600" : "bg-blue-50 text-blue-500"}`}>
                <Upload className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">파일 멀티 선택</p>
                <p className="mt-1 text-xs text-gray-400">여러 개의 파일을 한 번에 업로드할 수 있습니다.</p>
                <p className="mt-1 text-xs text-gray-400">PDF / AUDIO / VIDEO</p>
              </div>

              <input
                type="file"
                accept={acceptedExtensions}
                multiple
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  setSelectedFiles(files);
                  setErrorMessage("");
                }}
                className="hidden"
              />
            </label>
            {isDragActive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="rounded-lg bg-white/80 border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700">
                  파일을 놓으면 업로드됩니다
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <p className="text-xs font-semibold tracking-wide text-gray-400">
              SELECTED FILES
            </p>
            {selectedFiles && selectedFiles.length > 0 ? (
              <div className="mt-2 space-y-2">
                {selectedFiles.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <p className="truncate text-sm text-gray-700">{f.name}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
                      }}
                      className="ml-2 rounded p-1 text-gray-400 hover:bg-gray-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1 truncate text-sm text-gray-700">선택된 파일이 없습니다.</p>
            )}
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">

          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || !(selectedFiles && selectedFiles.length > 0)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                업로드 중...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                업로드
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};