import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from 'base-ds'
import { UserMenu } from '../UserMenu'
import { useAuthStore } from '@/stores/auth.store'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

function renderUserMenu() {
  return render(
    <ToastProvider>
      <UserMenu />
    </ToastProvider>,
  )
}

afterEach(async () => {
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
  pushMock.mockClear()
})

describe('UserMenu', () => {
  it('renders login link when unauthenticated', () => {
    renderUserMenu()
    const link = screen.getByRole('link', { name: /entrar/i })
    expect(link).toHaveAttribute('href', '/login')
  })

  it('renders avatar button when authenticated', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      user: { id: '1', name: 'João Silva', email: 'joao@test.com', role: 'CUSTOMER' },
      role: 'CUSTOMER',
    })
    renderUserMenu()
    expect(screen.getByRole('button', { name: /menu do usuário/i })).toBeInTheDocument()
  })

  it('does not render login link when authenticated', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      user: { id: '1', name: 'João Silva', email: 'joao@test.com', role: 'CUSTOMER' },
      role: 'CUSTOMER',
    })
    renderUserMenu()
    expect(screen.queryByRole('link', { name: /entrar/i })).not.toBeInTheDocument()
  })

  it('shows dropdown with profile link after clicking avatar', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      user: { id: '1', name: 'João Silva', email: 'joao@test.com', role: 'CUSTOMER' },
      role: 'CUSTOMER',
    })
    renderUserMenu()

    await user.click(screen.getByRole('button', { name: /menu do usuário/i }))

    expect(screen.getByRole('menuitem', { name: /perfil/i })).toBeInTheDocument()
  })

  it('shows "Meus Pedidos" link in the dropdown when authenticated', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      user: { id: '1', name: 'João Silva', email: 'joao@test.com', role: 'CUSTOMER' },
      role: 'CUSTOMER',
    })
    renderUserMenu()

    await user.click(screen.getByRole('button', { name: /menu do usuário/i }))

    const link = screen.getByRole('menuitem', { name: /meus pedidos/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/orders')
  })

  it('shows "Minhas Avaliações" link in the dropdown when authenticated', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      user: { id: '1', name: 'João Silva', email: 'joao@test.com', role: 'CUSTOMER' },
      role: 'CUSTOMER',
    })
    renderUserMenu()

    await user.click(screen.getByRole('button', { name: /menu do usuário/i }))

    const link = screen.getByRole('menuitem', { name: /minhas avaliações/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/reviews')
  })

  it('exibe link "Dashboard" apontando para /dashboard/admin quando role=ADMIN', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      role: 'ADMIN' as const,
      user: { id: '1', name: 'Admin', email: 'admin@test.com', role: 'ADMIN' as const },
    })
    renderUserMenu()

    await user.click(screen.getByRole('button', { name: /menu do usuário/i }))

    const link = screen.getByRole('menuitem', { name: /dashboard/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/dashboard/admin')
  })

  it('exibe link "Dashboard" apontando para /dashboard quando role=EMPLOYEE', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      role: 'EMPLOYEE' as const,
      user: { id: '1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE' as const, permissions: [] },
    })
    renderUserMenu()

    await user.click(screen.getByRole('button', { name: /menu do usuário/i }))

    const link = screen.getByRole('menuitem', { name: /dashboard/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/dashboard')
  })

  it('não exibe link "Dashboard" para role=CUSTOMER', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      role: 'CUSTOMER' as const,
      user: { id: '1', name: 'João Silva', email: 'joao@test.com', role: 'CUSTOMER' as const },
    })
    renderUserMenu()

    await user.click(screen.getByRole('button', { name: /menu do usuário/i }))

    expect(screen.queryByRole('menuitem', { name: /dashboard/i })).not.toBeInTheDocument()
  })

  it('calls logout and redirects to home when clicking Sair', async () => {
    const user = userEvent.setup()
    const logoutSpy = vi.spyOn(useAuthStore.getState(), 'logout')
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      user: { id: '1', name: 'João Silva', email: 'joao@test.com', role: 'CUSTOMER' },
      role: 'CUSTOMER',
    })
    renderUserMenu()

    await user.click(screen.getByRole('button', { name: /menu do usuário/i }))
    await user.click(screen.getByRole('menuitem', { name: /sair/i }))

    expect(logoutSpy).toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith('/')
  })
})
