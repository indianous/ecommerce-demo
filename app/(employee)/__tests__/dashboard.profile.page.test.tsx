import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ProfilePage from '../dashboard/profile/page'
import { useAuthStore } from '@/stores/auth.store'

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
      user: { id: '1', name: 'Funcionário', email: 'employee@test.com', role: 'EMPLOYEE' },
    })
    render(<ProfilePage />)
    expect(screen.getByRole('heading', { name: /meu perfil/i })).toBeInTheDocument()
  })

  it('exibe o nome e e-mail do usuário como somente leitura', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      user: { id: '1', name: 'Funcionário', email: 'employee@test.com', role: 'EMPLOYEE' },
    })
    render(<ProfilePage />)
    expect(screen.getByText('Funcionário')).toBeInTheDocument()
    expect(screen.getByText('employee@test.com')).toBeInTheDocument()
  })
})
