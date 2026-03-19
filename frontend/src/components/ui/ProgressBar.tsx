import { cn } from "../../lib/cn"

interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  trackClassName?: string
  fillClassName?: string
}

export function ProgressBar({
  value,
  max = 100,
  className,
  trackClassName,
  fillClassName,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(value, max))
  const width = `${(clamped / max) * 100}%`

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("h-1.5 w-full rounded-full bg-slate-200 overflow-hidden", trackClassName)}>
        <div className={cn("h-full rounded-full bg-[var(--color-brand-600)]", fillClassName)} style={{ width }} />
      </div>
    </div>
  )
}
