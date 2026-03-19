import type { ButtonHTMLAttributes, ReactNode } from "react"

import { cn } from "../../lib/cn"

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  size?: "sm" | "md" | "lg"
}

const sizeClassMap = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
} as const

export function IconButton({ icon, className, size = "md", type = "button", ...rest }: IconButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-strong)] transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        sizeClassMap[size],
        className,
      )}
      type={type}
      {...rest}
    >
      {icon}
    </button>
  )
}
