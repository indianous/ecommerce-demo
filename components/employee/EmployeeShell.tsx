'use client'
import { useCallback, useEffect, useMemo, useState, type ComponentProps } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SidebarAvatar } from '@/components/admin/SidebarAvatar'
import { Button, Icon, Sidebar } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import type { EmployeePermission } from '@/types'

type IconName = ComponentProps<typeof Icon>['name']

const ALL_NAV_ITEMS: { label: string; href: string; icon: IconName; perms: EmployeePermission[]; external?: boolean }[] = [
  { label: 'Pedidos', href: '/dashboard/orders', icon: 'ClipboardList', perms: ['MANAGE_ORDERS', 'MANAGE_ORDER_STATUS_REQUESTS'] },
  { label: 'Envios', href: '/dashboard/shipping', icon: 'Truck', perms: ['MANAGE_SHIPPING'] },
  { label: 'Solicitações', href: '/dashboard/change-requests', icon: 'ListChecks', perms: ['MANAGE_ORDER_STATUS_REQUESTS'] },
  { label: 'Produtos', href: '/dashboard/products', icon: 'Package', perms: ['MANAGE_PRODUCTS'] },
  { label: 'Estoque', href: '/dashboard/stock', icon: 'Boxes', perms: ['MANAGE_STOCK'] },
  { label: 'Excluídos', href: '/dashboard/products/deleted', icon: 'Trash2', perms: ['RESTORE_PRODUCTS'] },
  { label: 'Clientes', href: '/dashboard/customers', icon: 'Users', perms: ['MANAGE_CUSTOMERS'] },
  { label: 'Pagamentos', href: '/dashboard/payments', icon: 'CreditCard', perms: ['MANAGE_PAYMENTS'] },
  { label: 'Funcionários', href: '/dashboard/employees', icon: 'UserCog', perms: ['MANAGE_EMPLOYEES'] },
  { label: 'Site', href: '/dashboard/site', icon: 'Globe', perms: ['MANAGE_SITE'] },
  { label: 'Analytics', href: '/dashboard/analytics', icon: 'BarChart3', perms: ['MANAGE_ANALYTICS'] },
  { label: 'Ver site', href: '/', icon: 'ExternalLink', perms: [], external: true },
]

export function EmployeeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
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
      {/* Desktop sidebar — hidden on mobile, visible from md breakpoint, fixo na lateral */}
      <div className="hidden md:block sticky top-0 h-screen">
        <Sidebar
          items={navItems.map((item) => ({
            label: item.label,
            icon: <Icon name={item.icon} size="sm" />,
            active: pathname === item.href,
            asChild: (
              <Link
                href={item.href}
                {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              />
            ),
          }))}
          collapsed={collapsed}
          onCollapse={setCollapsed}
          footer={<SidebarAvatar profileHref="/dashboard/profile" collapsed={collapsed} />}
        />
      </div>

      <div className="flex flex-col flex-1">
        {/* Mobile header */}
        <header className="flex items-center gap-3 p-4 border-b border-border md:hidden">
          <Button iconOnly leftIcon={<Icon name="Menu" size="sm" />} aria-label="Abrir menu" variant="ghost" className="md:hidden" onClick={() => setDrawerOpen(true)} />
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
