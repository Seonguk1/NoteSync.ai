import { useState } from "react"

import { Folder, FolderPlus, MoreVertical, Settings, Star } from "lucide-react"

import { ModalFrame } from "../../../components/layout"
import { Button, DropdownMenu } from "../../../components/ui"
import { cn } from "../../../lib/cn"
import type { FolderItem } from "../types"

interface LectureSidebarProps {
  folders: FolderItem[]
  selectedFolderId: number | null
  onSelectFolder: (id: number | null) => void
  onCreateFolder?: (name: string) => Promise<void> | void
  onRenameFolder?: (folderId: number, nextName: string) => Promise<void> | void
  onDeleteFolder?: (folderId: number) => Promise<void> | void
}

export function LectureSidebar({ folders, selectedFolderId, onSelectFolder, onCreateFolder, onRenameFolder, onDeleteFolder }: LectureSidebarProps) {
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [openFolderMenuId, setOpenFolderMenuId] = useState<number | null>(null)
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null)
  const [nextFolderName, setNextFolderName] = useState("")
  const [deletingFolder, setDeletingFolder] = useState<FolderItem | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isActing, setIsActing] = useState(false)

  async function closeOrCreateFolder() {
    const trimmed = newFolderName.trim()
    if (trimmed && onCreateFolder) {
      await onCreateFolder(trimmed)
    }
    setNewFolderName("")
    setIsCreatingFolder(false)
  }

  async function handleRenameFolderSubmit() {
    if (!editingFolder || !onRenameFolder) {
      setEditingFolder(null)
      return
    }

    const trimmed = nextFolderName.trim()
    if (!trimmed) {
      setActionError("폴더 이름은 공백일 수 없습니다.")
      return
    }

    try {
      setIsActing(true)
      setActionError(null)
      await onRenameFolder(editingFolder.id, trimmed)
      setEditingFolder(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "폴더 이름 수정에 실패했습니다.")
    } finally {
      setIsActing(false)
    }
  }

  async function handleDeleteFolderSubmit() {
    if (!deletingFolder || !onDeleteFolder) {
      setDeletingFolder(null)
      return
    }

    try {
      setIsActing(true)
      setActionError(null)
      await onDeleteFolder(deletingFolder.id)
      setDeletingFolder(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "폴더 삭제에 실패했습니다.")
    } finally {
      setIsActing(false)
    }
  }

  return (
    <div className="flex h-full flex-col p-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-brand-600)]">AI Script Platform</p>
        <p className="mt-1 text-lg font-extrabold tracking-tight text-[var(--color-text-strong)]">NoteSync-AI</p>
      </div>

      <nav className="mt-8 space-y-6">
        <section>
          <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Menu</p>
          <ul className="space-y-1">
            <li>
              <button
                className={cn(
                  "flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold transition-colors",
                  selectedFolderId === null
                    ? "bg-[var(--color-brand-100)] text-[var(--color-brand-600)]"
                    : "text-[var(--color-text-default)] hover:bg-[var(--color-surface-muted)]",
                )}
                onClick={() => onSelectFolder(null)}
                type="button"
              >
                <Star className="h-4 w-4" />
                <span>All Boards</span>
              </button>
            </li>
          </ul>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Folders</p>
            <button
              className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
              onClick={() => {
                setNewFolderName("")
                setIsCreatingFolder(true)
              }}
              type="button"
            >
              <FolderPlus className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-1">
            {isCreatingFolder ? (
              <li>
                <input
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-brand-500)] bg-white px-3 py-2 text-sm outline-none"
                  onBlur={() => {
                    void closeOrCreateFolder()
                  }}
                  onChange={(event) => setNewFolderName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void closeOrCreateFolder()
                    }
                    if (event.key === "Escape") {
                      setNewFolderName("")
                      setIsCreatingFolder(false)
                    }
                  }}
                  placeholder="새로운 폴더"
                  type="text"
                  value={newFolderName}
                />
              </li>
            ) : null}
            {folders.map((folder) => (
              <li key={folder.id} className="relative">
                <div
                  className={cn(
                    "group flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-3 py-2",
                    selectedFolderId === folder.id
                      ? "bg-[var(--color-brand-100)] text-[var(--color-brand-600)]"
                      : "text-[var(--color-text-default)] hover:bg-[var(--color-surface-muted)]"
                  )}
                  onClick={() => onSelectFolder(folder.id)}
                >
                  <Folder className={cn("h-4 w-4 shrink-0", selectedFolderId === folder.id ? "text-[var(--color-brand-600)]" : "text-[var(--color-text-muted)]")} />
                  <span className={cn("flex-1 truncate text-left text-sm font-medium", selectedFolderId === folder.id ? "text-[var(--color-brand-600)] font-bold" : "text-[var(--color-text-default)]")}>{folder.name}</span>
                  {typeof folder.boardCount === "number" ? (
                    <span className={cn("text-xs", selectedFolderId === folder.id ? "text-[var(--color-brand-500)]" : "text-[var(--color-text-muted)]")}>{folder.boardCount}</span>
                  ) : null}
                  <button
                    className="rounded p-0.5 text-[var(--color-text-muted)] opacity-0 transition-opacity hover:bg-slate-200 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenFolderMenuId(openFolderMenuId === folder.id ? null : folder.id)
                    }}
                    type="button"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </div>
                {openFolderMenuId === folder.id ? (
                  <DropdownMenu
                    items={[
                      {
                        label: "이름 수정하기",
                        onClick: () => {
                          setActionError(null)
                          setNextFolderName(folder.name)
                          setEditingFolder(folder)
                        },
                      },
                      {
                        label: "삭제하기",
                        onClick: () => {
                          setActionError(null)
                          setDeletingFolder(folder)
                        },
                        danger: true,
                      },
                    ]}
                    onClose={() => setOpenFolderMenuId(null)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </nav>

      <div className="mt-auto border-t border-slate-200 pt-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-xs font-bold text-[var(--color-brand-600)]">
            JD
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-strong)]">Jane Doe</p>
            <p className="text-xs text-[var(--color-text-muted)]">Pro Account</p>
          </div>
          <button className="ml-auto rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]" type="button">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {editingFolder ? (
        <ModalFrame description="폴더 이름을 수정합니다." onClose={() => setEditingFolder(null)} title="폴더 이름 수정">
          <div className="space-y-4">
            {actionError ? <p className="text-xs text-red-600">{actionError}</p> : null}
            <input
              className="h-10 w-full rounded-[var(--radius-md)] border border-slate-200 px-3 text-sm outline-none focus:border-[var(--color-brand-500)]"
              onChange={(event) => setNextFolderName(event.target.value)}
              type="text"
              value={nextFolderName}
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setEditingFolder(null)} variant="ghost">
                취소
              </Button>
              <Button disabled={isActing} onClick={() => void handleRenameFolderSubmit()}>
                저장
              </Button>
            </div>
          </div>
        </ModalFrame>
      ) : null}

      {deletingFolder ? (
        <ModalFrame description="보드가 포함된 폴더는 삭제할 수 없습니다." onClose={() => setDeletingFolder(null)} title="폴더 삭제">
          <div className="space-y-4">
            {actionError ? <p className="text-xs text-red-600">{actionError}</p> : null}
            <p className="text-sm text-[var(--color-text-default)]">정말로 '{deletingFolder.name}' 폴더를 삭제하시겠습니까?</p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setDeletingFolder(null)} variant="ghost">
                취소
              </Button>
              <Button disabled={isActing} onClick={() => void handleDeleteFolderSubmit()} variant="danger">
                삭제
              </Button>
            </div>
          </div>
        </ModalFrame>
      ) : null}
    </div>
  )
}
