import { render, screen } from '@testing-library/react'
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

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
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
