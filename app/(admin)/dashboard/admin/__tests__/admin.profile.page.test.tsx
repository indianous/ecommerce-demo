import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import AdminProfilePage from '../profile/page'
import { useAuthStore } from '@/stores/auth.store'

afterEach(async () => {
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})

describe('Admin ProfilePage', () => {
  it('renderiza o título "Meu Perfil"', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      user: { id: '1', name: 'Admin Silva', email: 'admin@test.com', role: 'ADMIN' },
    })
    render(<AdminProfilePage />)
    expect(screen.getByRole('heading', { name: /meu perfil/i })).toBeInTheDocument()
  })

  it('exibe o nome e e-mail do usuário como somente leitura', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      user: { id: '1', name: 'Admin Silva', email: 'admin@test.com', role: 'ADMIN' },
    })
    render(<AdminProfilePage />)
    expect(screen.getByText('Admin Silva')).toBeInTheDocument()
    expect(screen.getByText('admin@test.com')).toBeInTheDocument()
  })
})
