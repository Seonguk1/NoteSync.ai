import { cn } from "../../lib/cn"

export type StatusChipVariant = "completed" | "processing" | "failed" | "neutral"

interface StatusChipProps {
  label: string
  variant?: StatusChipVariant
  className?: string
}

const variantClassMap: Record<StatusChipVariant, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  processing: "bg-[var(--color-brand-100)] text-[var(--color-brand-600)]",
  failed: "bg-rose-100 text-rose-700",
  neutral: "bg-slate-100 text-slate-600",
}

export function StatusChip({ label, variant = "neutral", className }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-bold uppercase tracking-wide",
        variantClassMap[variant],
        className,
      )}
    >
      {label}
    </span>
  )
}
