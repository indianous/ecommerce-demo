'use client'
import { cloneElement, useState, type HTMLAttributes, type ReactElement } from 'react'

interface TooltipProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  label: string
  children: ReactElement
}

function chain(existing: unknown, next: () => void) {
  return (e: unknown) => {
    if (typeof existing === 'function') existing(e)
    next()
  }
}

export function Tooltip({ label, children, ...rest }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const childProps = children.props as Record<string, unknown>

  const trigger = cloneElement(children, {
    ...rest,
    onMouseEnter: chain(childProps.onMouseEnter, () => setOpen(true)),
    onMouseLeave: chain(childProps.onMouseLeave, () => setOpen(false)),
    onFocus: chain(childProps.onFocus, () => setOpen(true)),
    onBlur: chain(childProps.onBlur, () => setOpen(false)),
  } as Partial<unknown>)

  return (
    <span className="relative inline-flex">
      {trigger}
      {open && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background"
        >
          {label}
        </span>
      )}
    </span>
  )
}
