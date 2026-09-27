import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ToastProvider, ToastViewport } from '@indianous/base-ds'
import ProfilePage from '../dashboard/profile/page'
import { useAuthStore } from '@/stores/auth.store'

function renderPage() {
  return render(
    <ToastProvider>
      <ProfilePage />
      <ToastViewport />
    </ToastProvider>,
  )
}

afterEach(async () => {
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})

describe('Employee ProfilePage', () => {
  it('renderiza o título "Meu Perfil"', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      user: { id: '1', name: 'Funcionário', email: 'employee@test.com', role: 'EMPLOYEE', permissions: [], phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null},
    })
    renderPage()
    expect(screen.getByRole('heading', { name: /meu perfil/i })).toBeInTheDocument()
  })

  it('exibe o nome e e-mail do usuário como somente leitura', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      user: { id: '1', name: 'Funcionário', email: 'employee@test.com', role: 'EMPLOYEE', permissions: [], phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null},
    })
    renderPage()
    expect(screen.getByText('Funcionário')).toBeInTheDocument()
    expect(screen.getByText('employee@test.com')).toBeInTheDocument()
  })

  it('renderiza a seção "Trocar senha" com o formulário de alteração', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      user: { id: '1', name: 'Funcionário', email: 'employee@test.com', role: 'EMPLOYEE', permissions: [], phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null},
    })
    renderPage()
    expect(screen.getByRole('heading', { name: /trocar senha/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/senha atual/i)).toBeInTheDocument()
  })

  it('renderiza a seção "Verificação em duas etapas", obrigatória e sem Desativar', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      user: { id: '1', name: 'Funcionário', email: 'employee@test.com', role: 'EMPLOYEE', permissions: [], phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null, mfaEnabled: true, mfaEnabledAt: '2026-09-24T12:00:00Z', recoveryCodesRemaining: 10 },
    })
    renderPage()
    expect(screen.getByRole('heading', { name: /verificação em duas etapas/i })).toBeInTheDocument()
    expect(screen.getByText(/obrigatória para a equipe/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^desativar$/i })).not.toBeInTheDocument()
  })
})
