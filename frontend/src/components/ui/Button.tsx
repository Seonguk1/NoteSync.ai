import type { ButtonHTMLAttributes, ReactNode } from "react"

import { cn } from "../../lib/cn"

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"
type ButtonSize = "sm" | "md" | "lg"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
}

const variantClassMap: Record<ButtonVariant, string> = {
  primary: "bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-500)]",
  secondary:
    "bg-[var(--color-surface-elevated)] text-[var(--color-text-default)] border border-slate-200 hover:bg-[var(--color-surface-muted)]",
  ghost: "bg-transparent text-[var(--color-text-default)] hover:bg-[var(--color-surface-muted)]",
  danger: "bg-[var(--color-danger)] text-white hover:opacity-90",
}

const sizeClassMap: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  leadingIcon,
  trailingIcon,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variantClassMap[variant],
        sizeClassMap[size],
        className,
      )}
      type={type}
      {...rest}
    >
      {leadingIcon}
      <span>{children}</span>
      {trailingIcon}
    </button>
  )
}
