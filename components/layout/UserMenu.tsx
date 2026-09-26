'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Avatar, Button, DropdownMenu } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { useStorefrontSession } from '@/stores/storefront-session'

export function UserMenu() {
  const { isAuthenticated, user } = useStorefrontSession()
  const logout = useAuthStore((s) => s.logout)
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

  return (
    <DropdownMenu
      align="end"
      trigger={
        <Button variant="ghost" size="sm" aria-label="Menu do usuário">
          <Avatar alt={user?.name ?? 'Usuário'} fallback={initials} size="sm" />
        </Button>
      }
      items={[
        ...(user?.role === 'CUSTOMER'
          ? [
              { label: 'Perfil', href: '/profile' },
              { label: 'Meus Pedidos', href: '/orders' },
              { label: 'Minhas Avaliações', href: '/reviews' },
            ]
          : []),
        { type: 'separator' },
        { label: 'Sair', onClick: handleLogout, danger: true },
      ]}
    />
  )
}
