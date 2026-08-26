import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DashboardMobileNavList, groupNavItems } from '../DashboardMobileNavList'
import { DASHBOARD_NAV_GROUPS, type DashboardNavItem } from '../dashboard-nav-groups'

describe('groupNavItems', () => {
  it('insere um cabeçalho antes de cada sequência contígua do mesmo grupo', () => {
    const items: DashboardNavItem[] = [
      { label: 'Pedidos', href: '/orders', icon: 'ClipboardList', group: DASHBOARD_NAV_GROUPS.VENDAS },
      { label: 'Envios', href: '/shipping', icon: 'Truck', group: DASHBOARD_NAV_GROUPS.VENDAS },
      { label: 'Produtos', href: '/products', icon: 'Package', group: DASHBOARD_NAV_GROUPS.CATALOGO },
    ]

    const rows = groupNavItems(items)

    expect(rows.map((r) => (r.type === 'header' ? `header:${r.group}` : `item:${r.item.label}`))).toEqual([
      'header:Vendas',
      'item:Pedidos',
      'item:Envios',
      'header:Catálogo',
      'item:Produtos',
    ])
  })

  it('itens sem group não recebem cabeçalho, em qualquer posição', () => {
    const items: DashboardNavItem[] = [
      { label: 'Pedidos', href: '/orders', icon: 'ClipboardList', group: DASHBOARD_NAV_GROUPS.VENDAS },
      { label: 'Ver site', href: '/', icon: 'ExternalLink' },
    ]

    const rows = groupNavItems(items)

    expect(rows.map((r) => (r.type === 'header' ? `header:${r.group}` : `item:${r.item.label}`))).toEqual([
      'header:Vendas',
      'item:Pedidos',
      'item:Ver site',
    ])
  })

  it('grupo de um item só ainda recebe cabeçalho', () => {
    const items: DashboardNavItem[] = [
      { label: 'Site', href: '/site', icon: 'Globe', group: DASHBOARD_NAV_GROUPS.SISTEMA },
    ]

    const rows = groupNavItems(items)

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ type: 'header', group: 'Sistema' })
    expect(rows[1]).toMatchObject({ type: 'item', item: { label: 'Site' } })
  })

  it('lista vazia (todo o grupo filtrado) não gera cabeçalho nenhum', () => {
    expect(groupNavItems([])).toEqual([])
  })
})

describe('DashboardMobileNavList', () => {
  const items: DashboardNavItem[] = [
    { label: 'Pedidos', href: '/dashboard/orders', icon: 'ClipboardList', group: DASHBOARD_NAV_GROUPS.VENDAS },
    { label: 'Envios', href: '/dashboard/shipping', icon: 'Truck', group: DASHBOARD_NAV_GROUPS.VENDAS },
    { label: 'Produtos', href: '/dashboard/products', icon: 'Package', group: DASHBOARD_NAV_GROUPS.CATALOGO },
    { label: 'Ver site', href: '/', icon: 'ExternalLink', external: true },
  ]

  it('renderiza cabeçalhos de grupo e links na ordem esperada', () => {
    render(<DashboardMobileNavList items={items} pathname="/dashboard" onNavigate={vi.fn()} />)

    expect(screen.getByText('Vendas')).toBeInTheDocument()
    expect(screen.getByText('Catálogo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /pedidos/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver site/i })).toBeInTheDocument()
  })

  it('item correspondente ao pathname recebe aria-current="page"', () => {
    render(<DashboardMobileNavList items={items} pathname="/dashboard/products" onNavigate={vi.fn()} />)

    expect(screen.getByRole('link', { name: /produtos/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /pedidos/i })).not.toHaveAttribute('aria-current')
  })

  it('item "Ver site" abre em nova aba', () => {
    render(<DashboardMobileNavList items={items} pathname="/dashboard" onNavigate={vi.fn()} />)

    const link = screen.getByRole('link', { name: /ver site/i })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('clicar num link chama onNavigate', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<DashboardMobileNavList items={items} pathname="/dashboard" onNavigate={onNavigate} />)

    await user.click(screen.getByRole('link', { name: /pedidos/i }))

    expect(onNavigate).toHaveBeenCalledTimes(1)
  })
})
