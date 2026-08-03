import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from '../dashboard/page'
import { useAuthStore } from '@/stores/auth.store'
import type { EmployeePermission } from '@/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/dashboard',
}))

function makeEmployee(permissions: EmployeePermission[] = []) {
  return {
    isAuthenticated: true,
    accessToken: 'tok',
    role: 'EMPLOYEE' as const,
    user: {
      id: '1',
      name: 'Ana Lima',
      email: 'ana@test.com',
      role: 'EMPLOYEE' as const,
      permissions,
    },
  }
}

afterEach(async () => {
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})

function renderDashboard() {
  return render(<DashboardPage />)
}

describe('DashboardPage — heading', () => {
  it('exibe heading "Bem-vindo" com o nome do usuário', async () => {
    useAuthStore.setState(makeEmployee([]))
    await act(async () => { renderDashboard() })
    expect(screen.getByRole('heading', { name: /bem-vindo.*ana lima/i })).toBeInTheDocument()
  })
})

describe('DashboardPage — cards por permissão', () => {
  beforeEach(() => {
    useAuthStore.setState(makeEmployee(['MANAGE_ORDERS', 'MANAGE_PRODUCTS', 'MANAGE_CUSTOMERS', 'MANAGE_PAYMENTS', 'MANAGE_EMPLOYEES', 'MANAGE_ORDER_STATUS_REQUESTS']))
  })

  it('exibe card "Pedidos" quando tem MANAGE_ORDERS', async () => {
    useAuthStore.setState(makeEmployee(['MANAGE_ORDERS']))
    await act(async () => { renderDashboard() })
    expect(screen.getByRole('heading', { name: /pedidos/i })).toBeInTheDocument()
  })

  it('exibe card "Envios" quando tem MANAGE_SHIPPING (sem MANAGE_ORDERS)', async () => {
    useAuthStore.setState(makeEmployee(['MANAGE_SHIPPING']))
    await act(async () => { renderDashboard() })
    expect(screen.getByRole('heading', { name: /envios/i })).toBeInTheDocument()
  })

  it('exibe card "Pedidos" quando tem MANAGE_ORDER_STATUS_REQUESTS', async () => {
    useAuthStore.setState(makeEmployee(['MANAGE_ORDER_STATUS_REQUESTS']))
    await act(async () => { renderDashboard() })
    expect(screen.getByRole('heading', { name: /pedidos/i })).toBeInTheDocument()
  })

  it('exibe card "Solicitações" quando tem MANAGE_ORDER_STATUS_REQUESTS', async () => {
    useAuthStore.setState(makeEmployee(['MANAGE_ORDER_STATUS_REQUESTS']))
    await act(async () => { renderDashboard() })
    expect(screen.getByRole('heading', { name: /solicitações/i })).toBeInTheDocument()
  })

  it('exibe card "Produtos" quando tem MANAGE_PRODUCTS', async () => {
    useAuthStore.setState(makeEmployee(['MANAGE_PRODUCTS']))
    await act(async () => { renderDashboard() })
    expect(screen.getByRole('heading', { name: /produtos/i })).toBeInTheDocument()
  })

  it('exibe card "Estoque" quando tem MANAGE_STOCK', async () => {
    useAuthStore.setState(makeEmployee(['MANAGE_STOCK']))
    await act(async () => { renderDashboard() })
    expect(screen.getByRole('heading', { name: /estoque/i })).toBeInTheDocument()
  })

  it('exibe card "Produtos" quando tem RESTORE_PRODUCTS', async () => {
    useAuthStore.setState(makeEmployee(['RESTORE_PRODUCTS']))
    await act(async () => { renderDashboard() })
    expect(screen.getByRole('heading', { name: /produtos/i })).toBeInTheDocument()
  })

  it('exibe card "Clientes" quando tem MANAGE_CUSTOMERS', async () => {
    useAuthStore.setState(makeEmployee(['MANAGE_CUSTOMERS']))
    await act(async () => { renderDashboard() })
    expect(screen.getByRole('heading', { name: /clientes/i })).toBeInTheDocument()
  })

  it('exibe card "Pagamentos" quando tem MANAGE_PAYMENTS', async () => {
    useAuthStore.setState(makeEmployee(['MANAGE_PAYMENTS']))
    await act(async () => { renderDashboard() })
    expect(screen.getByRole('heading', { name: /pagamentos/i })).toBeInTheDocument()
  })

  it('exibe card "Funcionários" quando tem MANAGE_EMPLOYEES', async () => {
    useAuthStore.setState(makeEmployee(['MANAGE_EMPLOYEES']))
    await act(async () => { renderDashboard() })
    expect(screen.getByRole('heading', { name: /funcionários/i })).toBeInTheDocument()
  })

  it('não exibe cards de seções sem permissão', async () => {
    useAuthStore.setState(makeEmployee(['MANAGE_CUSTOMERS']))
    await act(async () => { renderDashboard() })
    expect(screen.queryByRole('heading', { name: /pedidos/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /produtos/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /pagamentos/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /funcionários/i })).not.toBeInTheDocument()
  })

  it('sem nenhuma permissão, exibe heading mas nenhum card de módulo', async () => {
    useAuthStore.setState(makeEmployee([]))
    await act(async () => { renderDashboard() })
    expect(screen.getByRole('heading', { name: /bem-vindo/i })).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('cada card contém link que aponta para a rota correspondente', async () => {
    useAuthStore.setState(makeEmployee(['MANAGE_ORDERS', 'MANAGE_CUSTOMERS']))
    await act(async () => { renderDashboard() })
    const pedidosLink = screen.getByRole('link', { name: /pedidos/i })
    const clientesLink = screen.getByRole('link', { name: /clientes/i })
    expect(pedidosLink).toHaveAttribute('href', '/dashboard/orders')
    expect(clientesLink).toHaveAttribute('href', '/dashboard/customers')
  })
})
