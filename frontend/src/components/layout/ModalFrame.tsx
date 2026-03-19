import type { ReactNode } from "react"
import { useEffect } from "react"

import { X } from "lucide-react"

import { cn } from "../../lib/cn"
import { IconButton } from "../ui/IconButton"

interface ModalFrameProps {
  title?: string
  description?: string
  children: ReactNode
  onClose?: () => void
  className?: string
}

export function ModalFrame({ title, description, children, onClose, className }: ModalFrameProps) {
  useEffect(() => {
    if (!onClose) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        className={cn(
          "relative w-full max-w-2xl rounded-[var(--radius-lg)] border border-slate-200 bg-[var(--color-surface-elevated)] p-6 shadow-[var(--shadow-soft)] max-h-[90vh] overflow-y-auto",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {onClose ? (
          <IconButton aria-label="닫기" className="absolute right-3 top-3" icon={<X className="h-4 w-4" />} onClick={onClose} />
        ) : null}

        {title ? <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text-strong)]">{title}</h2> : null}
        {description ? <p className="mt-2 text-sm text-[var(--color-text-muted)]">{description}</p> : null}

        <div className="mt-6">{children}</div>
      </section>
    </div>
  )
}
