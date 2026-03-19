import { Button } from "../../../components/ui"
import { ModalFrame } from "../../../components/layout"

interface BoardMetaModalProps {
  isOpen: boolean
  isSaving: boolean
  title: string
  folderId: number | null
  folderOptions: Array<{ id: number; name: string }>
  onTitleChange: (value: string) => void
  onFolderChange: (value: number | null) => void
  onClose: () => void
  onSave: () => void
}

export function BoardMetaModal({
  isOpen,
  isSaving,
  title,
  folderId,
  folderOptions,
  onTitleChange,
  onFolderChange,
  onClose,
  onSave,
}: BoardMetaModalProps) {
  if (!isOpen) return null
  return (
    <ModalFrame description="보드 제목과 폴더를 수정할 수 있습니다." onClose={onClose} title="보드 정보 수정">
      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--color-text-strong)]">보드 제목</span>
          <input
            className="h-10 w-full rounded-[var(--radius-md)] border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-[var(--color-brand-500)]"
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="보드 제목을 입력하세요"
            type="text"
            value={title}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--color-text-strong)]">폴더</span>
          <select
            className="h-10 w-full rounded-[var(--radius-md)] border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-[var(--color-brand-500)]"
            onChange={(event) => {
              const value = Number(event.target.value)
              onFolderChange(Number.isFinite(value) ? value : null)
            }}
            value={folderId ?? ""}
          >
            <option value="">폴더 선택</option>
            {folderOptions.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onClose} variant="ghost">
            취소
          </Button>
          <Button disabled={isSaving} onClick={onSave}>
            {isSaving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>
    </ModalFrame>
  )
}
