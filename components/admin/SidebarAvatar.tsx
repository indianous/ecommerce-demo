'use client'
import { Avatar, DropdownMenu } from 'base-ds'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'

interface SidebarAvatarProps {
  profileHref: string
  collapsed?: boolean
}

export function SidebarAvatar({ profileHref, collapsed = false }: SidebarAvatarProps) {
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
      aria-label="Menu do admin"
      className="flex items-center gap-3 w-full"
    >
      <Avatar alt={user?.name ?? 'Admin'} fallback={initial} size="md" />
      <span className={collapsed ? 'sr-only' : undefined}>{user?.name}</span>
    </button>
  )

  return (
    <DropdownMenu
      trigger={trigger}
      items={[
        { label: 'Perfil', href: profileHref },
        { type: 'separator' },
        { label: 'Sair', onClick: handleLogout },
      ]}
    />
  )
}
