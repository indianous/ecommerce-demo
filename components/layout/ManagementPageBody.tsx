import type { ReactNode } from 'react'

interface ManagementPageBodyProps {
  actions?: ReactNode
  children: ReactNode
}

export function ManagementPageBody({ actions, children }: ManagementPageBodyProps) {
  return (
    <div>
      {actions && <div className="mb-4 flex justify-end gap-2 flex-wrap">{actions}</div>}
      {children}
    </div>
  )
}
