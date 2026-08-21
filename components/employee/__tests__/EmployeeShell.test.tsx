import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from 'base-ds'
import { EmployeeShell } from '../EmployeeShell'
import { useAuthStore } from '@/stores/auth.store'
import type { EmployeePermission } from '@/types'

const pushMock = vi.fn()
let mockPathname = '/dashboard'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => mockPathname,
}))

function makeEmployee(permissions: EmployeePermission[] = []) {
  return {
    isAuthenticated: true,
    accessToken: 'tok',
    role: 'EMPLOYEE' as const,
    user: {
      id: '2',
      name: 'Funcionário',
      email: 'employee@test.com',
      role: 'EMPLOYEE' as const,
      permissions,
      phone: null,
      birthDate: null,
      gender: 'PREFIRO_NAO_DIZER' as const,
    },
  }
}

const authenticatedEmployee = makeEmployee([])

function renderEmployeeShell(pathname = '/dashboard') {
  mockPathname = pathname
  return render(
    <ToastProvider>
      <EmployeeShell>
        <p>conteúdo da página</p>
      </EmployeeShell>
    </ToastProvider>,
  )
}

afterEach(async () => {
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
  pushMock.mockClear()
})

describe('EmployeeShell — Sidebar (desktop)', () => {
  it('renderiza nav com aria-label="Sidebar navigation", com wrapper hidden md:block', () => {
    useAuthStore.setState(makeEmployee(['MANAGE_ORDERS']))
    renderEmployeeShell()
    const nav = screen.getByRole('navigation', { name: /sidebar navigation/i })
    expect(nav).toBeInTheDocument()
    expect(nav.parentElement).toHaveClass('hidden', 'md:block')
  })

  it('sem permissões, nenhum item de menu é exibido', () => {
    useAuthStore.setState(makeEmployee([]))
    renderEmployeeShell()
    expect(screen.queryByRole('link', { name: /pedidos/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /produtos/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /clientes/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /pagamentos/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /funcionários/i })).not.toBeInTheDocument()
  })

  it('MANAGE_ORDERS exibe item "Pedidos"', () => {
    useAuthStore.setState(makeEmployee(['MANAGE_ORDERS']))
    renderEmployeeShell()
    expect(screen.getByRole('link', { name: /pedidos/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /produtos/i })).not.toBeInTheDocument()
  })

  it('MANAGE_SHIPPING exibe item "Envios" (sem MANAGE_ORDERS)', () => {
    useAuthStore.setState(makeEmployee(['MANAGE_SHIPPING']))
    renderEmployeeShell()
    expect(screen.getByRole('link', { name: /envios/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^pedidos$/i })).not.toBeInTheDocument()
  })

  it('MANAGE_ORDER_STATUS_REQUESTS exibe item "Pedidos"', () => {
    useAuthStore.setState(makeEmployee(['MANAGE_ORDER_STATUS_REQUESTS']))
    renderEmployeeShell()
    expect(screen.getByRole('link', { name: /pedidos/i })).toBeInTheDocument()
  })

  it('MANAGE_PRODUCTS exibe item "Produtos"', () => {
    useAuthStore.setState(makeEmployee(['MANAGE_PRODUCTS']))
    renderEmployeeShell()
    expect(screen.getByRole('link', { name: /produtos/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /pedidos/i })).not.toBeInTheDocument()
  })

  it('MANAGE_STOCK exibe item "Estoque"', () => {
    useAuthStore.setState(makeEmployee(['MANAGE_STOCK']))
    renderEmployeeShell()
    expect(screen.getByRole('link', { name: /^estoque$/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^produtos$/i })).not.toBeInTheDocument()
  })

  it('RESTORE_PRODUCTS exibe item "Excluídos"', () => {
    useAuthStore.setState(makeEmployee(['RESTORE_PRODUCTS']))
    renderEmployeeShell()
    expect(screen.getByRole('link', { name: /^excluídos$/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^produtos$/i })).not.toBeInTheDocument()
  })

  it('MANAGE_CUSTOMERS exibe item "Clientes"', () => {
    useAuthStore.setState(makeEmployee(['MANAGE_CUSTOMERS']))
    renderEmployeeShell()
    expect(screen.getByRole('link', { name: /clientes/i })).toBeInTheDocument()
  })

  it('MANAGE_PAYMENTS exibe item "Pagamentos"', () => {
    useAuthStore.setState(makeEmployee(['MANAGE_PAYMENTS']))
    renderEmployeeShell()
    expect(screen.getByRole('link', { name: /pagamentos/i })).toBeInTheDocument()
  })

  it('MANAGE_EMPLOYEES exibe item "Funcionários"', () => {
    useAuthStore.setState(makeEmployee(['MANAGE_EMPLOYEES']))
    renderEmployeeShell()
    expect(screen.getByRole('link', { name: /funcionários/i })).toBeInTheDocument()
  })

  it('MANAGE_ANALYTICS exibe item "Analytics"', () => {
    useAuthStore.setState(makeEmployee(['MANAGE_ANALYTICS']))
    renderEmployeeShell()
    expect(screen.getByRole('link', { name: /analytics/i })).toBeInTheDocument()
  })

  it('sem MANAGE_ANALYTICS não exibe item "Analytics"', () => {
    useAuthStore.setState(makeEmployee(['MANAGE_ORDERS']))
    renderEmployeeShell()
    expect(screen.queryByRole('link', { name: /analytics/i })).not.toBeInTheDocument()
  })

  it('múltiplas permissões exibem múltiplos itens', () => {
    useAuthStore.setState(makeEmployee(['MANAGE_ORDERS', 'MANAGE_PRODUCTS', 'MANAGE_CUSTOMERS']))
    renderEmployeeShell()
    expect(screen.getByRole('link', { name: /pedidos/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /produtos/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /clientes/i })).toBeInTheDocument()
  })

  it('não exibe item Funcionários quando não tem MANAGE_EMPLOYEES', () => {
    useAuthStore.setState(makeEmployee(['MANAGE_ORDERS', 'MANAGE_PRODUCTS']))
    renderEmployeeShell()
    expect(screen.queryByRole('link', { name: /funcionários/i })).not.toBeInTheDocument()
  })

  it('item correspondente ao pathname atual recebe aria-current="page"', () => {
    useAuthStore.setState(makeEmployee(['MANAGE_ORDERS', 'MANAGE_PRODUCTS']))
    renderEmployeeShell('/dashboard/orders')
    expect(screen.getByRole('link', { name: /pedidos/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /produtos/i })).not.toHaveAttribute('aria-current')
  })

  it('MANAGE_ORDER_STATUS_REQUESTS exibe item "Solicitações"', () => {
    useAuthStore.setState(makeEmployee(['MANAGE_ORDER_STATUS_REQUESTS']))
    renderEmployeeShell()
    expect(screen.getByRole('link', { name: /solicitações/i })).toBeInTheDocument()
  })

  it('sem MANAGE_ORDER_STATUS_REQUESTS não exibe "Solicitações"', () => {
    useAuthStore.setState(makeEmployee(['MANAGE_ORDERS']))
    renderEmployeeShell()
    expect(screen.queryByRole('link', { name: /solicitações/i })).not.toBeInTheDocument()
  })

  it('renderiza {children} na área de conteúdo principal', () => {
    useAuthStore.setState(makeEmployee(['MANAGE_ORDERS']))
    renderEmployeeShell()
    expect(screen.getByText('conteúdo da página')).toBeInTheDocument()
  })

  it('item "Ver site" aparece mesmo sem nenhuma permissão, aponta para "/" e abre em nova aba', () => {
    useAuthStore.setState(makeEmployee([]))
    renderEmployeeShell()
    const link = screen.getByRole('link', { name: /ver site/i })
    expect(link).toHaveAttribute('href', '/')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })
})

describe('EmployeeShell — Sidebar recolhível (desktop)', () => {
  it('clicar no botão de recolher esconde os rótulos dos itens (ficam sr-only)', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(makeEmployee(['MANAGE_ORDERS']))
    renderEmployeeShell()

    const pedidosLink = screen.getByRole('link', { name: /pedidos/i })
    expect(pedidosLink.querySelector('span:not(.sr-only)')).toHaveTextContent('Pedidos')

    await user.click(screen.getByRole('button', { name: /toggle sidebar/i }))

    expect(pedidosLink.querySelector('span.sr-only')).toHaveTextContent('Pedidos')
  })

  it('recolher também esconde o nome no SidebarAvatar (fica sr-only)', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(makeEmployee(['MANAGE_ORDERS']))
    renderEmployeeShell()

    await user.click(screen.getByRole('button', { name: /toggle sidebar/i }))

    expect(screen.getByText('Funcionário')).toHaveClass('sr-only')
  })
})

describe('EmployeeShell — Hamburger e Drawer (mobile)', () => {
  it('renderiza botão hamburger com aria-label="Abrir menu" e classe md:hidden', () => {
    useAuthStore.setState(makeEmployee(['MANAGE_ORDERS']))
    renderEmployeeShell()
    const btn = screen.getByRole('button', { name: /abrir menu/i })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveClass('md:hidden')
  })

  it('clicar no hamburger abre o Drawer com os itens de navegação permitidos', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(makeEmployee(['MANAGE_ORDERS', 'MANAGE_PRODUCTS']))
    renderEmployeeShell()

    await user.click(screen.getByRole('button', { name: /abrir menu/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /pedidos/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /produtos/i }).length).toBeGreaterThan(0)
  })

  it('item ativo no Drawer recebe aria-current="page"', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(makeEmployee(['MANAGE_ORDERS', 'MANAGE_PRODUCTS']))
    renderEmployeeShell('/dashboard/products')

    await user.click(screen.getByRole('button', { name: /abrir menu/i }))

    const links = screen.getAllByRole('link', { name: /produtos/i })
    expect(links.some((l) => l.getAttribute('aria-current') === 'page')).toBe(true)
  })

  it('clicar no backdrop fecha o Drawer', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(makeEmployee(['MANAGE_ORDERS']))
    renderEmployeeShell()

    await user.click(screen.getByRole('button', { name: /abrir menu/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByTestId('drawer-backdrop'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('pressionar Escape fecha o Drawer', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(makeEmployee(['MANAGE_ORDERS']))
    renderEmployeeShell()

    await user.click(screen.getByRole('button', { name: /abrir menu/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('EmployeeShell — Acessibilidade', () => {
  it('sem violações com Drawer fechado', async () => {
    useAuthStore.setState(makeEmployee(['MANAGE_ORDERS']))
    const { container } = renderEmployeeShell()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('sem violações com Drawer aberto', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(makeEmployee(['MANAGE_ORDERS']))
    const { container } = renderEmployeeShell()

    await user.click(screen.getByRole('button', { name: /abrir menu/i }))

    expect(await axe(container)).toHaveNoViolations()
  })
})
