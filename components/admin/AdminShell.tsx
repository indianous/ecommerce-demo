'use client'
import { useCallback, useEffect, useState, type ComponentProps } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SidebarAvatar } from './SidebarAvatar'
import { Button, Icon, Sidebar } from 'base-ds'

type IconName = ComponentProps<typeof Icon>['name']

const navItems: { label: string; href: string; icon: IconName; external?: boolean }[] = [
  { label: 'Pedidos', href: '/dashboard/admin/orders', icon: 'ClipboardList' },
  { label: 'Envios', href: '/dashboard/admin/shipping', icon: 'Truck' },
  { label: 'Solicitações', href: '/dashboard/admin/change-requests', icon: 'ListChecks' },
  { label: 'Produtos', href: '/dashboard/admin/products', icon: 'Package' },
  { label: 'Estoque', href: '/dashboard/admin/stock', icon: 'Boxes' },
  { label: 'Excluídos', href: '/dashboard/admin/products/deleted', icon: 'Trash2' },
  { label: 'Clientes', href: '/dashboard/admin/customers', icon: 'Users' },
  { label: 'Funcionários', href: '/dashboard/admin/employees', icon: 'UserCog' },
  { label: 'Administradores', href: '/dashboard/admin/admins', icon: 'ShieldCheck' },
  { label: 'Pagamentos', href: '/dashboard/admin/payments', icon: 'CreditCard' },
  { label: 'Auditoria', href: '/dashboard/admin/audit-logs', icon: 'History' },
  { label: 'Site', href: '/dashboard/admin/site', icon: 'Globe' },
  { label: 'Analytics', href: '/dashboard/admin/analytics', icon: 'BarChart3' },
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
