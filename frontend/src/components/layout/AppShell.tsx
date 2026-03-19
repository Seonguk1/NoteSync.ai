import type { ReactNode } from "react"

import { cn } from "../../lib/cn"

interface AppShellProps {
  sidebar?: ReactNode
  header?: ReactNode
  children: ReactNode
  className?: string
}

export function AppShell({ sidebar, header, children, className }: AppShellProps) {
  return (
    <div className={cn("flex h-screen w-full overflow-hidden bg-[var(--color-surface-canvas)]", className)}>
      {sidebar ? (
        <aside className="w-[var(--spacing-sidebar)] shrink-0 border-r border-slate-200 bg-[var(--color-surface-elevated)]">
          {sidebar}
        </aside>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        {header ? (
          <header className="shrink-0 border-b border-slate-200 bg-[var(--color-surface-elevated)]">
            {header}
          </header>
        ) : null}
        <main className="min-h-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
