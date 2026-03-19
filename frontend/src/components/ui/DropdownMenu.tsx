import { useEffect, useRef } from "react"

import { cn } from "../../lib/cn"

interface DropdownMenuItem {
  label: string
  onClick: () => void
  danger?: boolean
  active?: boolean
}

interface DropdownMenuProps {
  items: DropdownMenuItem[]
  onClose: () => void
  position?: "bottom" | "top"
}

export function DropdownMenu({ items, onClose, position = "bottom" }: DropdownMenuProps) {
  const ref = useRef<HTMLUListElement>(null)

  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [onClose])

  return (
    <ul
      ref={ref}
      className={cn(
        "absolute right-0 z-50 min-w-[9rem] rounded-[var(--radius-md)] border border-slate-200 bg-white py-1 shadow-[var(--shadow-soft)]",
        position === "top" ? "bottom-full mb-2" : "top-full mt-1",
      )}
      onClick={(event) => event.stopPropagation()}
    >
      {items.map((item) => (
        <li key={item.label}>
          <button
            className={cn(
              "w-full px-4 py-2 text-left text-sm",
              item.active && !item.danger && "bg-[var(--color-brand-50)] font-semibold text-[var(--color-brand-600)]",
              item.danger
                ? "text-red-600 hover:bg-red-50"
                : "text-[var(--color-text-default)] hover:bg-[var(--color-surface-muted)]",
            )}
            onClick={() => {
              item.onClick()
              onClose()
            }}
            type="button"
          >
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  )
}
