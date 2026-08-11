'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SidebarAvatar } from './SidebarAvatar'

const navItems = [
  { label: 'Pedidos', href: '/dashboard/admin/orders' },
  { label: 'Envios', href: '/dashboard/admin/shipping' },
  { label: 'Solicitações', href: '/dashboard/admin/change-requests' },
  { label: 'Produtos', href: '/dashboard/admin/products' },
  { label: 'Estoque', href: '/dashboard/admin/stock' },
  { label: 'Excluídos', href: '/dashboard/admin/products/deleted' },
  { label: 'Clientes', href: '/dashboard/admin/customers' },
  { label: 'Funcionários', href: '/dashboard/admin/employees' },
  { label: 'Pagamentos', href: '/dashboard/admin/payments' },
  { label: 'Auditoria', href: '/dashboard/admin/audit-logs' },
  { label: 'Site', href: '/dashboard/admin/site' },
  { label: 'Ver site', href: '/', external: true },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

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
      {/* Desktop sidebar — hidden on mobile, visible from md breakpoint */}
      <nav
        aria-label="Sidebar navigation"
        className="hidden md:flex flex-col w-64 border-r border-border p-4 gap-2"
      >
        <div className="mb-4">
          <SidebarAvatar profileHref="/dashboard/admin/profile" />
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
