import { useMemo, useState } from "react"

import { MoreVertical } from "lucide-react"

import { ModalFrame } from "../../../components/layout"
import { Button, DropdownMenu, IconButton, ProgressBar, StatusChip } from "../../../components/ui"
import { cn } from "../../../lib/cn"
import { LECTURE_STATUS, type FolderItem, type LectureItem } from "../types"

interface LectureTableProps {
  items: LectureItem[]
  folders: FolderItem[]
  onOpenBoard: (id: number) => void
  onRenameBoard: (boardId: number, nextTitle: string) => Promise<void>
  onMoveBoard: (boardId: number, nextFolderId: number) => Promise<void>
  onDeleteBoard: (boardId: number) => Promise<void>
  onRetry?: (item: LectureItem) => void
}

type ActiveAction =
  | { type: "rename"; item: LectureItem }
  | { type: "move"; item: LectureItem }
  | { type: "delete"; item: LectureItem }
  | null

export function LectureTable({ items, folders, onOpenBoard, onRenameBoard, onMoveBoard, onDeleteBoard, onRetry }: LectureTableProps) {
  const [activeAction, setActiveAction] = useState<ActiveAction>(null)
  const [nextTitle, setNextTitle] = useState("")
  const [nextFolderId, setNextFolderId] = useState<number | null>(folders[0]?.id ?? null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isActing, setIsActing] = useState(false)

  const activeItem = activeAction?.item ?? null

  const defaultFolderId = useMemo(() => folders[0]?.id ?? null, [folders])

  function openRename(item: LectureItem) {
    setActionError(null)
    setNextTitle(item.title)
    setActiveAction({ type: "rename", item })
  }

  function openMove(item: LectureItem) {
    setActionError(null)
    setNextFolderId(defaultFolderId)
    setActiveAction({ type: "move", item })
  }

  function openDelete(item: LectureItem) {
    setActionError(null)
    setActiveAction({ type: "delete", item })
  }

  async function submitRename() {
    if (!activeItem) return
    const trimmed = nextTitle.trim()
    if (!trimmed) {
      setActionError("보드 이름은 공백일 수 없습니다.")
      return
    }

    try {
      setIsActing(true)
      setActionError(null)
      await onRenameBoard(activeItem.id, trimmed)
      setActiveAction(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "보드 이름 수정에 실패했습니다.")
    } finally {
      setIsActing(false)
    }
  }

  async function submitMove() {
    if (!activeItem) return
    if (!nextFolderId) {
      setActionError("이동할 폴더를 선택해 주세요.")
      return
    }

    try {
      setIsActing(true)
      setActionError(null)
      await onMoveBoard(activeItem.id, nextFolderId)
      setActiveAction(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "보드 폴더 이동에 실패했습니다.")
    } finally {
      setIsActing(false)
    }
  }

  async function submitDelete() {
    if (!activeItem) return

    try {
      setIsActing(true)
      setActionError(null)
      await onDeleteBoard(activeItem.id)
      setActiveAction(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "보드 삭제에 실패했습니다.")
    } finally {
      setIsActing(false)
    }
  }

  return (
    <>
      <div className="overflow-visible rounded-[var(--radius-lg)] border border-slate-200 bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)]">
        <table className="w-full border-collapse text-left">
          <thead className="bg-[var(--color-surface-muted)]">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Title</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Length</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Created Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <LectureRow
                key={item.id}
                item={item}
                onDelete={openDelete}
                onMove={openMove}
                onOpenBoard={onOpenBoard}
                onRename={openRename}
                onRetry={onRetry}
              />
            ))}
          </tbody>
        </table>
      </div>

      {activeAction?.type === "rename" && activeItem ? (
        <ModalFrame description="보드 이름을 수정합니다." onClose={() => setActiveAction(null)} title="보드 이름 수정">
          <div className="space-y-4">
            {actionError ? <p className="text-xs text-red-600">{actionError}</p> : null}
            <input
              className="h-10 w-full rounded-[var(--radius-md)] border border-slate-200 px-3 text-sm outline-none focus:border-[var(--color-brand-500)]"
              onChange={(event) => setNextTitle(event.target.value)}
              type="text"
              value={nextTitle}
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setActiveAction(null)} variant="ghost">
                취소
              </Button>
              <Button disabled={isActing} onClick={() => void submitRename()}>
                저장
              </Button>
            </div>
          </div>
        </ModalFrame>
      ) : null}

      {activeAction?.type === "move" && activeItem ? (
        <ModalFrame description="보드를 다른 폴더로 이동합니다." onClose={() => setActiveAction(null)} title="폴더 이동">
          <div className="space-y-4">
            {actionError ? <p className="text-xs text-red-600">{actionError}</p> : null}
            <select
              className="h-10 w-full rounded-[var(--radius-md)] border border-slate-200 px-3 text-sm outline-none focus:border-[var(--color-brand-500)]"
              onChange={(event) => {
                const value = Number(event.target.value)
                setNextFolderId(Number.isFinite(value) ? value : null)
              }}
              value={nextFolderId ?? ""}
            >
              <option value="">폴더 선택</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setActiveAction(null)} variant="ghost">
                취소
              </Button>
              <Button disabled={isActing} onClick={() => void submitMove()}>
                이동
              </Button>
            </div>
          </div>
        </ModalFrame>
      ) : null}

      {activeAction?.type === "delete" && activeItem ? (
        <ModalFrame description="삭제된 보드는 복구할 수 없습니다." onClose={() => setActiveAction(null)} title="보드 삭제">
          <div className="space-y-4">
            {actionError ? <p className="text-xs text-red-600">{actionError}</p> : null}
            <p className="text-sm text-[var(--color-text-default)]">정말로 '{activeItem.title}' 보드를 삭제하시겠습니까?</p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setActiveAction(null)} variant="ghost">
                취소
              </Button>
              <Button disabled={isActing} onClick={() => void submitDelete()} variant="danger">
                삭제
              </Button>
            </div>
          </div>
        </ModalFrame>
      ) : null}
    </>
  )
}

function LectureRow({
  item,
  onOpenBoard,
  onRename,
  onMove,
  onDelete,
  onRetry,
}: {
  item: LectureItem
  onOpenBoard: (id: number) => void
  onRename: (item: LectureItem) => void
  onMove: (item: LectureItem) => void
  onDelete: (item: LectureItem) => void
  onRetry: (item: LectureItem) => void
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const isProcessing = item.status === LECTURE_STATUS.processing
  const isFailed = item.status === LECTURE_STATUS.failed
  const canOpen = !isProcessing

  const menuItems = []
  if (isProcessing) {
    menuItems.push({ danger: true, label: "삭제하기", onClick: () => onDelete(item) })
  } else {
    if (isFailed && onRetry) {
      menuItems.push({ label: "재시도", onClick: () => onRetry(item) })
    }
    menuItems.push({ label: "이름 수정하기", onClick: () => onRename(item) })
    menuItems.push({ label: "폴더 이동하기", onClick: () => onMove(item) })
    menuItems.push({ danger: true, label: "삭제하기", onClick: () => onDelete(item) })
  }

  return (
    <tr
      className={cn("border-t border-slate-100", canOpen && "hover:bg-slate-50", isProcessing && "opacity-80")}
      onClick={() => {
        if (!canOpen) return
        onOpenBoard(item.id)
      }}
    >
      <td className="px-6 py-5 align-top">
        <div>
          <button
            className={cn(
              "text-left text-base font-semibold transition-colors hover:text-[var(--color-brand-600)]",
              isProcessing ? "text-slate-500" : "text-[var(--color-text-strong)]",
            )}
            disabled={!canOpen}
            onClick={(event) => {
              event.stopPropagation()
              if (!canOpen) return
              onOpenBoard(item.id)
            }}
            type="button"
          >
            {item.title}
          </button>
          {isProcessing ? (
            <div className="mt-2 flex items-center gap-3">
              <div className="w-36">
                <ProgressBar value={item.progressPercent ?? 0} />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-brand-600)]">
                Extracting... {item.progressPercent ?? 0}%
              </span>
            </div>
          ) : null}
        </div>
      </td>
      <td className="px-6 py-5 text-sm font-medium text-[var(--color-text-default)]">{item.lengthLabel}</td>
      <td className="px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--color-text-muted)]">{item.createdAtLabel}</span>
            <StatusChip label={item.status} variant={isProcessing ? "processing" : isFailed ? "failed" : "completed"} />
          </div>
          <div className="relative">
            <IconButton
              aria-label="행 액션"
              icon={<MoreVertical className="h-4 w-4" />}
              onClick={(event) => {
                event.stopPropagation()
                setIsMenuOpen((prev) => !prev)
              }}
              size="sm"
            />
            {isMenuOpen ? (
              <DropdownMenu
                items={menuItems}
                onClose={() => setIsMenuOpen(false)}
              />
            ) : null}
          </div>
        </div>
      </td>
    </tr>
  )
}
