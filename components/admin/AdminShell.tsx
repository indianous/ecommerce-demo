'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SidebarAvatar } from './SidebarAvatar'
import { Button, Icon, Sidebar } from 'base-ds'
import { DashboardMobileNavList } from '@/components/layout/DashboardMobileNavList'
import { DASHBOARD_NAV_GROUPS, type DashboardNavItem } from '@/components/layout/dashboard-nav-groups'

const navItems: DashboardNavItem[] = [
  { label: 'Pedidos', href: '/dashboard/admin/orders', icon: 'ClipboardList', group: DASHBOARD_NAV_GROUPS.VENDAS },
  { label: 'Envios', href: '/dashboard/admin/shipping', icon: 'Truck', group: DASHBOARD_NAV_GROUPS.VENDAS },
  { label: 'Solicitações', href: '/dashboard/admin/change-requests', icon: 'ListChecks', group: DASHBOARD_NAV_GROUPS.VENDAS },
  { label: 'Pagamentos', href: '/dashboard/admin/payments', icon: 'CreditCard', group: DASHBOARD_NAV_GROUPS.VENDAS },
  { label: 'Produtos', href: '/dashboard/admin/products', icon: 'Package', group: DASHBOARD_NAV_GROUPS.CATALOGO },
  { label: 'Estoque', href: '/dashboard/admin/stock', icon: 'Boxes', group: DASHBOARD_NAV_GROUPS.CATALOGO },
  { label: 'Excluídos', href: '/dashboard/admin/products/deleted', icon: 'Trash2', group: DASHBOARD_NAV_GROUPS.CATALOGO },
  { label: 'Clientes', href: '/dashboard/admin/customers', icon: 'Users', group: DASHBOARD_NAV_GROUPS.PESSOAS },
  { label: 'Funcionários', href: '/dashboard/admin/employees', icon: 'UserCog', group: DASHBOARD_NAV_GROUPS.PESSOAS },
  { label: 'Administradores', href: '/dashboard/admin/admins', icon: 'ShieldCheck', group: DASHBOARD_NAV_GROUPS.PESSOAS },
  { label: 'Auditoria', href: '/dashboard/admin/audit-logs', icon: 'History', group: DASHBOARD_NAV_GROUPS.SISTEMA },
  { label: 'Site', href: '/dashboard/admin/site', icon: 'Globe', group: DASHBOARD_NAV_GROUPS.SISTEMA },
  { label: 'Analytics', href: '/dashboard/admin/analytics', icon: 'BarChart3', group: DASHBOARD_NAV_GROUPS.SISTEMA },
  { label: 'Ver site', href: '/', icon: 'ExternalLink', external: true },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

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
            group: item.group,
            asChild: (
              <Link
                href={item.href}
                {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              />
            ),
          }))}
          collapsed={collapsed}
          onCollapse={setCollapsed}
          footer={<SidebarAvatar profileHref="/dashboard/admin/profile" collapsed={collapsed} />}
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
                <SidebarAvatar profileHref="/dashboard/admin/profile" />
              </div>
              <DashboardMobileNavList items={navItems} pathname={pathname} onNavigate={closeDrawer} />
            </div>
          </>
        )}

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
