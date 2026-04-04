// src/features/sidebar/components/CreateNoteModal.tsx

import { useEffect, useState } from "react";
import { FileText, Loader2, X } from "lucide-react";
import { createNote, type Material } from "../../../api/content";

type CreateNoteModalProps = {
  open: boolean;
  sessionId: number | null;
  onClose: () => void;
  onCreated?: (material: Material) => void;
};

export const CreateNoteModal = ({
  open,
  sessionId,
  onClose,
  onCreated,
}: CreateNoteModalProps) => {
  const [title, setTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open) {
      setTitle("");
      setIsCreating(false);
      setErrorMessage("");
    }
  }, [open]);

  if (!open) return null;

  const handleClose = () => {
    if (isCreating) return;
    onClose();
  };

  const handleCreate = async () => {
    if (!sessionId) {
      setErrorMessage("세션이 선택되지 않았습니다.");
      return;
    }

    const trimmed = title.trim();
    if (!trimmed) {
      setErrorMessage("노트 제목을 입력해주세요.");
      return;
    }

    try {
      setIsCreating(true);
      setErrorMessage("");

      const note = await createNote(sessionId, { title: trimmed });

      const material: Material = {
        id: note.material_id,
        type: "note",
        original_name: note.title,
        relative_path: null,
        file_url: null,
        status: "READY",
        created_at: note.created_at,
        session_id: note.session_id ?? sessionId,
      };

      onCreated?.(material);
      onClose();
    } catch (error) {
      console.error("노트 생성 실패:", error);
      setErrorMessage("노트 생성에 실패했습니다.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-gray-400">
              NOTE
            </p>
            <h2 className="text-base font-semibold text-gray-800">
              새 노트 만들기
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
          <div className="rounded-xl bg-gray-50 px-4 py-4">
            <div className="mb-3 flex items-center gap-2 text-gray-500">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">노트 제목</span>
            </div>

            <input
              autoFocus
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrorMessage("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreate();
                }
              }}
              placeholder="예: 1주차 개념 정리"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
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
            onClick={handleClose}
            disabled={isCreating}
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-50"
          >
            취소
          </button>

          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating || !title.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                생성
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};