import type { InputHTMLAttributes } from "react"

import { Search } from "lucide-react"

import { cn } from "../../lib/cn"

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string
}

export function SearchInput({ className, wrapperClassName, ...rest }: SearchInputProps) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        className={cn(
          "w-full rounded-[var(--radius-md)] border border-slate-200 bg-[var(--color-surface-muted)] py-2 pl-9 pr-3 text-sm outline-none transition-all focus:border-[var(--color-brand-500)] focus:bg-white",
          className,
        )}
        type="search"
        {...rest}
      />
    </div>
  )
}
