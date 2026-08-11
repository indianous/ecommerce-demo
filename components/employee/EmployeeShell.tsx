'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SidebarAvatar } from '@/components/admin/SidebarAvatar'
import { useAuthStore } from '@/stores/auth.store'
import type { EmployeePermission } from '@/types'

const ALL_NAV_ITEMS = [
  { label: 'Pedidos', href: '/dashboard/orders', perms: ['MANAGE_ORDERS', 'MANAGE_ORDER_STATUS_REQUESTS'] as EmployeePermission[] },
  { label: 'Envios', href: '/dashboard/shipping', perms: ['MANAGE_SHIPPING'] as EmployeePermission[] },
  { label: 'Solicitações', href: '/dashboard/change-requests', perms: ['MANAGE_ORDER_STATUS_REQUESTS'] as EmployeePermission[] },
  { label: 'Produtos', href: '/dashboard/products', perms: ['MANAGE_PRODUCTS'] as EmployeePermission[] },
  { label: 'Estoque', href: '/dashboard/stock', perms: ['MANAGE_STOCK'] as EmployeePermission[] },
  { label: 'Excluídos', href: '/dashboard/products/deleted', perms: ['RESTORE_PRODUCTS'] as EmployeePermission[] },
  { label: 'Clientes', href: '/dashboard/customers', perms: ['MANAGE_CUSTOMERS'] as EmployeePermission[] },
  { label: 'Pagamentos', href: '/dashboard/payments', perms: ['MANAGE_PAYMENTS'] as EmployeePermission[] },
  { label: 'Funcionários', href: '/dashboard/employees', perms: ['MANAGE_EMPLOYEES'] as EmployeePermission[] },
  { label: 'Site', href: '/dashboard/site', perms: ['MANAGE_SITE'] as EmployeePermission[] },
  { label: 'Ver site', href: '/', perms: [] as EmployeePermission[], external: true },
]

export function EmployeeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { user } = useAuthStore()

  const navItems = useMemo(() => {
    const permissions = user?.permissions ?? []
    return ALL_NAV_ITEMS.filter((item) =>
      item.perms.length === 0 || item.perms.some((p) => permissions.includes(p))
    )
  }, [user?.permissions])

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  useEffect(() => {
    if (!drawerOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeDrawer()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen, closeDrawer])

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <nav
        aria-label="Sidebar navigation"
        className="hidden md:flex flex-col w-64 border-r border-border p-4 gap-2"
      >
        <div className="mb-4">
          <SidebarAvatar profileHref="/dashboard/profile" />
        </div>
        <ul className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
                className="block px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
                {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex flex-col flex-1">
        {/* Mobile header */}
        <header className="flex items-center gap-3 p-4 border-b border-border md:hidden">
          <button
            type="button"
            aria-label="Abrir menu"
            className="md:hidden"
            onClick={() => setDrawerOpen(true)}
          >
            <span aria-hidden="true">☰</span>
          </button>
        </header>

        {/* Mobile drawer */}
        {drawerOpen && (
          <>
            <div
              data-testid="drawer-backdrop"
              className="fixed inset-0 bg-black/50 z-40"
              onClick={closeDrawer}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Menu de navegação"
              className="fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border p-4 flex flex-col gap-2"
            >
              <div className="mb-4">
                <SidebarAvatar profileHref="/dashboard/profile" />
              </div>
              <nav aria-label="Navegação mobile">
                <ul className="flex flex-col gap-1">
                  {navItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={pathname === item.href ? 'page' : undefined}
                        className="block px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
                        onClick={closeDrawer}
                        {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </>
        )}

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
