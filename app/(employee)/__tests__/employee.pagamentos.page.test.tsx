import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PagamentosPage from '../payments/page'
import { useAuthStore } from '@/stores/auth.store'

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}))

afterEach(async () => {
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
  replaceMock.mockClear()
})

describe('PagamentosPage', () => {
  it('exibe heading "Gestão de Pagamentos"', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      role: 'EMPLOYEE',
      user: { id: '1', name: 'Func', email: 'f@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_PAYMENTS'] },
    })
    await act(async () => { render(<PagamentosPage />) })
    expect(screen.getByRole('heading', { name: /gestão de pagamentos/i })).toBeInTheDocument()
  })

  it('redireciona para /dashboard quando usuário não tem MANAGE_PAYMENTS', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      role: 'EMPLOYEE',
      user: { id: '1', name: 'Func', email: 'f@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_ORDERS'] },
    })
    await act(async () => { render(<PagamentosPage />) })
    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
  })
})
