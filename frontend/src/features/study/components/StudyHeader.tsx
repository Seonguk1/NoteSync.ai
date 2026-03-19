import { ArrowLeft, ChevronRight } from "lucide-react"

import { Button, IconButton } from "../../../components/ui"

interface StudyHeaderProps {
  folder: string
  title: string
  onBack: () => void
  onEditMeta?: () => void
}

export function StudyHeader({ folder, title, onBack, onEditMeta }: StudyHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-[var(--color-surface-elevated)] px-6">
      <IconButton aria-label="뒤로 가기" icon={<ArrowLeft className="h-5 w-5" />} onClick={onBack} size="md" />
      <nav aria-label="경로" className="flex items-center gap-2 text-sm font-medium">
        <span className="cursor-pointer text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-strong)]">
          {folder}
        </span>
        <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)]" />
        <span className="font-semibold text-[var(--color-text-strong)]">{title}</span>
      </nav>
      {onEditMeta ? (
        <div className="ml-auto">
          <Button onClick={onEditMeta} size="sm" variant="secondary">
            정보 수정
          </Button>
        </div>
      ) : null}
    </header>
  )
}
