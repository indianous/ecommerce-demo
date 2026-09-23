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
  const user = useAuthStore((s) => s.user)
  const router = useRouter()

  // Decide pelo user, não pelo isAuthenticated: depois do refresh a sessão já está autenticada
  // mas o /me ainda não voltou — redirecionar nessa janela tirava o usuário da página (plano #59).
  const hasAccess = !!user && (user.role === 'ADMIN' || permissions.some((p) => user.permissions?.includes(p)))

  useEffect(() => {
    if (user && !hasAccess) {
      router.replace('/dashboard')
    }
  }, [user, hasAccess, router])

  if (!hasAccess) return null
  return <>{children}</>
}
