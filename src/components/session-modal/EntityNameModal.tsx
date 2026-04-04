import { useEffect, useState } from "react";

type EditableEntity = "term" | "course" | "session";

type EntityNameModalProps = {
  open: boolean;
  mode: "create" | "rename";
  entity: EditableEntity;
  initialName: string;
  onClose: () => void;
  onSave: (name: string) => void;
};

export const EntityNameModal = ({
  open,
  mode,
  entity,
  initialName,
  onClose,
  onSave,
}: EntityNameModalProps) => {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) {
      setName(initialName);
    }
  }, [open, initialName]);

  if (!open) return null;

  const labelMap = {
    term: "학기",
    course: "강의",
    session: "세션",
  } as const;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/35 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-800">
            {mode === "create" ? `${labelMap[entity]} 생성` : `${labelMap[entity]} 이름 변경`}
          </h3>
        </div>

        <div className="px-5 py-5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSave(name);
              }
            }}
            placeholder={`${labelMap[entity]} 이름 입력`}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100"
          >
            취소
          </button>

          <button
            type="button"
            onClick={() => onSave(name)}
            disabled={!name.trim()}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};