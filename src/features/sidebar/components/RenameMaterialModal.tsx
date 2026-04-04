import { useEffect, useState } from "react";
import { FileText, Loader2, X } from "lucide-react";
import { updateMaterial, updateNote, type Material } from "../../../api/content";

type RenameMaterialModalProps = {
  open: boolean;
  material: Material | null;
  onClose: () => void;
  onRenamed?: (updatedMaterial: Material) => void;
};

export const RenameMaterialModal = ({
  open,
  material,
  onClose,
  onRenamed,
}: RenameMaterialModalProps) => {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (open && material) {
      setName(material.original_name);
      setErrorMessage("");
      setIsSubmitting(false);
    }
  }, [open, material]);

  if (!open || !material) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMessage("이름을 입력해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      let updatedMaterial: Material;

      if (material.type === "note") {
        const updatedNote = await updateNote(material.id, { title: trimmed });
        updatedMaterial = {
          ...material,
          original_name: updatedNote.title,
        };
      } else {
        updatedMaterial = await updateMaterial(material.id, {
          original_name: trimmed,
        });
      }

      onRenamed?.(updatedMaterial);
      onClose();
    } catch (error) {
      console.error("이름 변경 실패:", error);
      setErrorMessage("이름 변경에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-gray-400">
              RENAME
            </p>
            <h2 className="text-base font-semibold text-gray-800">
              자료 이름 변경
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
              <span className="text-sm font-medium">새 이름</span>
            </div>

            <input
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrorMessage("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                }
              }}
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
            disabled={isSubmitting}
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-50"
          >
            취소
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              "저장"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};