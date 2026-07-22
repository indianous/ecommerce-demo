import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from 'base-ds'
import { EmployeeShell } from '../EmployeeShell'
import { useAuthStore } from '@/stores/auth.store'

const pushMock = vi.fn()
let mockPathname = '/dashboard'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => mockPathname,
}))

const authenticatedEmployee = {
  isAuthenticated: true,
  accessToken: 'tok',
  role: 'EMPLOYEE' as const,
  user: { id: '2', name: 'Funcionário', email: 'employee@test.com', role: 'EMPLOYEE' as const },
}

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
  it('renderiza nav com aria-label="Sidebar navigation" com classe hidden md:flex', () => {
    useAuthStore.setState(authenticatedEmployee)
    renderEmployeeShell()
    const nav = screen.getByRole('navigation', { name: /sidebar navigation/i })
    expect(nav).toBeInTheDocument()
    expect(nav).toHaveClass('hidden')
  })

  it('exibe os dois itens de menu: Pedidos e Produtos', () => {
    useAuthStore.setState(authenticatedEmployee)
    renderEmployeeShell()
    expect(screen.getByRole('link', { name: /pedidos/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /produtos/i })).toBeInTheDocument()
  })

  it('não exibe item Funcionários (exclusivo do admin)', () => {
    useAuthStore.setState(authenticatedEmployee)
    renderEmployeeShell()
    expect(screen.queryByRole('link', { name: /funcionários/i })).not.toBeInTheDocument()
  })

  it('item correspondente ao pathname atual recebe aria-current="page"', () => {
    useAuthStore.setState(authenticatedEmployee)
    renderEmployeeShell('/dashboard')
    expect(screen.getByRole('link', { name: /pedidos/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /produtos/i })).not.toHaveAttribute('aria-current')
  })

  it('renderiza {children} na área de conteúdo principal', () => {
    useAuthStore.setState(authenticatedEmployee)
    renderEmployeeShell()
    expect(screen.getByText('conteúdo da página')).toBeInTheDocument()
  })
})

describe('EmployeeShell — Hamburger e Drawer (mobile)', () => {
  it('renderiza botão hamburger com aria-label="Abrir menu" e classe md:hidden', () => {
    useAuthStore.setState(authenticatedEmployee)
    renderEmployeeShell()
    const btn = screen.getByRole('button', { name: /abrir menu/i })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveClass('md:hidden')
  })

  it('clicar no hamburger abre o Drawer com os itens de navegação', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedEmployee)
    renderEmployeeShell()

    await user.click(screen.getByRole('button', { name: /abrir menu/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /pedidos/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /produtos/i }).length).toBeGreaterThan(0)
  })

  it('item ativo no Drawer recebe aria-current="page"', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedEmployee)
    renderEmployeeShell('/products')

    await user.click(screen.getByRole('button', { name: /abrir menu/i }))

    const links = screen.getAllByRole('link', { name: /produtos/i })
    expect(links.some((l) => l.getAttribute('aria-current') === 'page')).toBe(true)
  })

  it('clicar no backdrop fecha o Drawer', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedEmployee)
    renderEmployeeShell()

    await user.click(screen.getByRole('button', { name: /abrir menu/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByTestId('drawer-backdrop'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('pressionar Escape fecha o Drawer', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedEmployee)
    renderEmployeeShell()

    await user.click(screen.getByRole('button', { name: /abrir menu/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('EmployeeShell — Acessibilidade', () => {
  it('sem violações com Drawer fechado', async () => {
    useAuthStore.setState(authenticatedEmployee)
    const { container } = renderEmployeeShell()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('sem violações com Drawer aberto', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedEmployee)
    const { container } = renderEmployeeShell()

    await user.click(screen.getByRole('button', { name: /abrir menu/i }))

    expect(await axe(container)).toHaveNoViolations()
  })
})
