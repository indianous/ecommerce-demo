import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from 'base-ds'
import { DashboardUserMenu } from '../DashboardUserMenu'
import { useAuthStore } from '@/stores/auth.store'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const authenticatedUser = {
  isAuthenticated: true,
  accessToken: 'tok',
  role: 'ADMIN' as const,
  user: {
    id: '1',
    name: 'Admin Silva',
    email: 'admin@test.com',
    role: 'ADMIN' as const,
    permissions: [],
    phone: null,
    birthDate: null,
    gender: 'PREFIRO_NAO_DIZER' as const, cpf: null,
  },
}

function renderMenu() {
  return render(
    <ToastProvider>
      <DashboardUserMenu profileHref="/dashboard/profile" />
    </ToastProvider>,
  )
}

afterEach(async () => {
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
  pushMock.mockClear()
})

describe('DashboardUserMenu', () => {
  it('renderiza Avatar com a inicial do nome do usuário logado', () => {
    useAuthStore.setState(authenticatedUser)
    renderMenu()
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('não exibe o e-mail do usuário no trigger', () => {
    useAuthStore.setState(authenticatedUser)
    renderMenu()
    expect(screen.queryByText('admin@test.com')).not.toBeInTheDocument()
  })

  it('botão flutuante: só o avatar, com o nome para leitor de tela e no title', () => {
    useAuthStore.setState(authenticatedUser)
    renderMenu()
    expect(screen.getByText('Admin Silva')).toHaveClass('sr-only')
    expect(screen.getByRole('button', { name: /menu do usuário/i })).toHaveAttribute('title', 'Admin Silva')
  })

  it('fica fixo no canto inferior direito, acima do conteúdo', () => {
    useAuthStore.setState(authenticatedUser)
    renderMenu()
    const floating = screen.getByRole('button', { name: /menu do usuário/i }).closest('.fixed')
    expect(floating).toHaveClass('fixed', 'bottom-4', 'right-4', 'z-30')
  })

  it('o menu abre para cima e alinhado à direita (não sai da tela)', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedUser)
    renderMenu()

    await user.click(screen.getByRole('button', { name: /menu do usuário/i }))

    expect(screen.getByRole('menu')).toHaveClass('bottom-full', 'right-0')
  })

  it('gatilho com aria-label "Menu do usuário"', () => {
    useAuthStore.setState(authenticatedUser)
    renderMenu()
    expect(screen.getByRole('button', { name: /^menu do usuário/i })).toBeInTheDocument()
  })

  it('link "Perfil" aparece no dropdown ao clicar no avatar', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedUser)
    renderMenu()

    await user.click(screen.getByRole('button', { name: /menu do usuário/i }))

    const profileLink = screen.getByRole('menuitem', { name: /perfil/i })
    expect(profileLink).toBeInTheDocument()
    expect(profileLink).toHaveAttribute('href', '/dashboard/profile')
  })

  it('abre DropdownMenu ao clicar no botão do Avatar', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedUser)
    renderMenu()

    await user.click(screen.getByRole('button', { name: /menu do usuário/i }))

    expect(screen.getByRole('menuitem', { name: /sair/i })).toBeInTheDocument()
  })

  it('item "Sair" chama logout() do authStore', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedUser)
    const logoutSpy = vi.spyOn(useAuthStore.getState(), 'logout')
    renderMenu()

    await user.click(screen.getByRole('button', { name: /menu do usuário/i }))
    await user.click(screen.getByRole('menuitem', { name: /sair/i }))

    expect(logoutSpy).toHaveBeenCalled()
  })

  it('após logout redireciona para /login', async () => {
    const user = userEvent.setup()
    useAuthStore.setState(authenticatedUser)
    renderMenu()

    await user.click(screen.getByRole('button', { name: /menu do usuário/i }))
    await user.click(screen.getByRole('menuitem', { name: /sair/i }))

    expect(pushMock).toHaveBeenCalledWith('/login')
  })

  it('sem violações de acessibilidade', async () => {
    useAuthStore.setState(authenticatedUser)
    const { container } = renderMenu()
    expect(await axe(container)).toHaveNoViolations()
  })
})
