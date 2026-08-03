'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import type { EmployeePermission } from '@/types'

interface Props {
  permissions: EmployeePermission[]
  children: React.ReactNode
}

export function PermissionGuard({ permissions, children }: Props) {
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()

  const hasAccess = permissions.some((p) => user?.permissions?.includes(p))

  useEffect(() => {
    if (isAuthenticated && !hasAccess) {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, hasAccess, router])

  if (!isAuthenticated || !hasAccess) return null
  return <>{children}</>
}
