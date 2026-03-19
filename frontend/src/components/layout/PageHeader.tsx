import type { ReactNode } from "react"

import { cn } from "../../lib/cn"

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex min-h-[var(--spacing-header)] items-center justify-between gap-4 px-6 py-3", className)}>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-extrabold tracking-tight text-[var(--color-text-strong)]">{title}</h1>
        {description ? <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="shrink-0 self-center">{actions}</div> : null}
    </div>
  )
}
