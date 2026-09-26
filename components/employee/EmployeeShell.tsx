'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button, Icon, Sidebar } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { DashboardMobileNavList } from '@/components/layout/DashboardMobileNavList'
import { DashboardUserMenu } from '@/components/layout/DashboardUserMenu'
import { DASHBOARD_NAV_GROUPS, type DashboardNavItem } from '@/components/layout/dashboard-nav-groups'
import { isNavItemActive } from '@/components/layout/dashboard-nav-active'
import { siteNavItems } from '@/lib/site-sections'
import type { EmployeePermission } from '@/types'

const ALL_NAV_ITEMS: (DashboardNavItem & { perms: EmployeePermission[] })[] = [
  { label: 'Pedidos', href: '/dashboard/orders', icon: 'ClipboardList', perms: ['MANAGE_ORDERS', 'MANAGE_ORDER_STATUS_REQUESTS', 'CREATE_ORDERS'], group: DASHBOARD_NAV_GROUPS.VENDAS },
  { label: 'Envios', href: '/dashboard/shipping', icon: 'Truck', perms: ['MANAGE_SHIPPING'], group: DASHBOARD_NAV_GROUPS.VENDAS },
  { label: 'Solicitações', href: '/dashboard/change-requests', icon: 'ListChecks', perms: ['MANAGE_ORDER_STATUS_REQUESTS'], group: DASHBOARD_NAV_GROUPS.VENDAS },
  { label: 'Pagamentos', href: '/dashboard/payments', icon: 'CreditCard', perms: ['MANAGE_PAYMENTS'], group: DASHBOARD_NAV_GROUPS.VENDAS },
  { label: 'Cupons', href: '/dashboard/coupons', icon: 'Ticket', perms: ['MANAGE_COUPONS'], group: DASHBOARD_NAV_GROUPS.VENDAS },
  { label: 'Produtos', href: '/dashboard/products', icon: 'Package', perms: ['MANAGE_PRODUCTS'], group: DASHBOARD_NAV_GROUPS.CATALOGO },
  { label: 'Categorias', href: '/dashboard/categories', icon: 'Tags', perms: ['MANAGE_PRODUCTS'], group: DASHBOARD_NAV_GROUPS.CATALOGO },
  { label: 'Promoções', href: '/dashboard/promotions', icon: 'BadgePercent', perms: ['MANAGE_PRODUCTS'], group: DASHBOARD_NAV_GROUPS.CATALOGO },
  { label: 'Estoque', href: '/dashboard/stock', icon: 'Boxes', perms: ['MANAGE_STOCK'], group: DASHBOARD_NAV_GROUPS.CATALOGO },
  { label: 'Excluídos', href: '/dashboard/products/deleted', icon: 'Trash2', perms: ['RESTORE_PRODUCTS'], group: DASHBOARD_NAV_GROUPS.CATALOGO },
  { label: 'Clientes', href: '/dashboard/customers', icon: 'Users', perms: ['MANAGE_CUSTOMERS'], group: DASHBOARD_NAV_GROUPS.PESSOAS },
  { label: 'Funcionários', href: '/dashboard/employees', icon: 'UserCog', perms: ['MANAGE_EMPLOYEES'], group: DASHBOARD_NAV_GROUPS.PESSOAS },
  ...siteNavItems('/dashboard/site').map((item): DashboardNavItem & { perms: EmployeePermission[] } => ({ ...item, perms: ['MANAGE_SITE'] })),
  { label: 'Analytics', href: '/dashboard/analytics', icon: 'BarChart3', perms: ['MANAGE_ANALYTICS'], group: DASHBOARD_NAV_GROUPS.SISTEMA },
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
      <div className="hidden md:block sticky top-0 h-screen overflow-y-auto">
        <Sidebar
          items={navItems.map((item) => ({
            label: item.label,
            icon: <Icon name={item.icon} size="sm" />,
            active: isNavItemActive(pathname, item, navItems),
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
              className="fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border p-4 flex flex-col gap-2 overflow-y-auto"
            >
              <DashboardMobileNavList items={navItems} pathname={pathname} onNavigate={closeDrawer} />
            </div>
          </>
        )}

        <main className="flex-1">{children}</main>

        {/* Menu do usuário flutuante, no canto inferior direito, no desktop e no celular */}
        <DashboardUserMenu profileHref="/dashboard/profile" />
      </div>
    </div>
  )
}
