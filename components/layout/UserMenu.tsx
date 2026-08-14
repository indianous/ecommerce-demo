'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Avatar, Button, DropdownMenu } from 'base-ds'
import { Tooltip } from '@/components/ui/Tooltip'
import { useAuthStore } from '@/stores/auth.store'

export function UserMenu() {
  const { isAuthenticated, user, logout } = useAuthStore()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  if (!isAuthenticated) {
    return (
      <Link
        href="/login"
        className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
        Entrar
      </Link>
    )
  }

  const initials = user?.name?.charAt(0).toUpperCase() ?? '?'

  const dashboardHref =
    user?.role === 'ADMIN' ? '/dashboard/admin' : user?.role === 'EMPLOYEE' ? '/dashboard' : null

  return (
    <DropdownMenu
      align="end"
      trigger={
        <Tooltip label="Menu do usuário">
          <Button variant="ghost" size="sm" aria-label="Menu do usuário">
            <Avatar alt={user?.name ?? 'Usuário'} fallback={initials} size="sm" />
          </Button>
        </Tooltip>
      }
      items={[
        ...(dashboardHref ? [{ label: 'Dashboard', href: dashboardHref }, { type: 'separator' as const }] : []),
        { label: 'Perfil', href: '/profile' },
        { label: 'Meus Pedidos', href: '/orders' },
        { label: 'Minhas Avaliações', href: '/reviews' },
        { type: 'separator' },
        { label: 'Sair', onClick: handleLogout, danger: true },
      ]}
    />
  )
}
