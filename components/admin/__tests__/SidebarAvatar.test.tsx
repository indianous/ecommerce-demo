import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from 'base-ds'
import { SidebarAvatar } from '../SidebarAvatar'
import { useAuthStore } from '@/stores/auth.store'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const authenticatedUser = {
  isAuthenticated: true,
  accessToken: 'tok',
  role: 'ADMIN' as const,
  user: { id: '1', name: 'Admin Silva', email: 'admin@test.com', role: 'ADMIN' as const },
}

function renderSidebarAvatar(props: { collapsed?: boolean } = {}) {
  return render(
    <ToastProvider>
      <SidebarAvatar profileHref="/dashboard/profile" {...props} />
    </ToastProvider>,
  )
}

afterEach(async () => {
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
  pushMock.mockClear()
})

describe('SidebarAvatar', () => {
  it('renderiza Avatar com a inicial do nome do usuário logado', () => {
    useAuthStore.setState(authenticatedUser)
    renderSidebarAvatar()
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('exibe o nome do usuário quando collapsed=false', () => {
    useAuthStore.setState(authenticatedUser)
    renderSidebarAvatar({ collapsed: false })
    expect(screen.getByText('Admin Silva')).toBeInTheDocument()
  })

  it('não exibe o e-mail do usuário no trigger', () => {
    useAuthStore.setState(authenticatedUser)
    renderSidebarAvatar()
    expect(screen.queryByText('admin@test.com')).not.toBeInTheDocument()
  })

  it('oculta nome com sr-only quando collapsed=true', () => {
    useAuthStore.setState(authenticatedUser)
    renderSidebarAvatar({ collapsed: true })
    expect(screen.getByText('Admin Silva')).toHaveClass('sr-only')
  })

  it('link "Perfil" aparece no dropdown ao clicar no avatar', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedUser)
    renderSidebarAvatar()

    await user.click(screen.getByRole('button', { name: /menu do admin/i }))

    const profileLink = screen.getByRole('menuitem', { name: /perfil/i })
    expect(profileLink).toBeInTheDocument()
    expect(profileLink).toHaveAttribute('href', '/dashboard/profile')
  })

  it('abre DropdownMenu ao clicar no botão do Avatar', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedUser)
    renderSidebarAvatar()

    await user.click(screen.getByRole('button', { name: /menu do admin/i }))

    expect(screen.getByRole('menuitem', { name: /sair/i })).toBeInTheDocument()
  })

  it('item "Sair" chama logout() do authStore', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedUser)
    const logoutSpy = vi.spyOn(useAuthStore.getState(), 'logout')
    renderSidebarAvatar()

    await user.click(screen.getByRole('button', { name: /menu do admin/i }))
    await user.click(screen.getByRole('menuitem', { name: /sair/i }))

    expect(logoutSpy).toHaveBeenCalled()
  })

  it('após logout redireciona para /login', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedUser)
    renderSidebarAvatar()

    await user.click(screen.getByRole('button', { name: /menu do admin/i }))
    await user.click(screen.getByRole('menuitem', { name: /sair/i }))

    expect(pushMock).toHaveBeenCalledWith('/login')
  })

  it('sem violações de acessibilidade', async () => {
    useAuthStore.setState(authenticatedUser)
    const { container } = renderSidebarAvatar()
    expect(await axe(container)).toHaveNoViolations()
  })
})
