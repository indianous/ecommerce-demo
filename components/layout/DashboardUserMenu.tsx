'use client'
import { Avatar, DropdownMenu } from '@indianous/base-ds'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'

interface DashboardUserMenuProps {
  profileHref: string
}

/** Avatar flutuante no canto inferior direito dos painéis, com "Perfil" e "Sair" num menu que abre para cima. */
export function DashboardUserMenu({ profileHref }: DashboardUserMenuProps) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const initial = user?.name?.charAt(0).toUpperCase() ?? '?'

  function handleLogout() {
    logout()
    router.push('/login')
  }

  const trigger = (
    <button
      type="button"
      aria-label="Menu do usuário"
      title={user?.name}
      className="rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <Avatar alt={user?.name ?? 'Usuário'} fallback={initial} size="lg" />
      <span className="sr-only">{user?.name}</span>
    </button>
  )

  return (
    <div className="fixed bottom-4 right-4 z-30">
      <DropdownMenu
        trigger={trigger}
        position="top"
        align="end"
        items={[
          { label: 'Perfil', href: profileHref },
          { type: 'separator' },
          { label: 'Sair', onClick: handleLogout },
        ]}
      />
    </div>
  )
}
