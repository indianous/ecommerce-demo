import { act, render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), back: vi.fn() }),
}))

import { ToastProvider } from 'base-ds'
import { CustomerDetailContent } from '../dashboard/customers/[id]/CustomerDetailContent'
import { useAuthStore } from '@/stores/auth.store'

const mockDetail = {
  id: 'c-1',
  name: 'João Silva',
  email: 'joao@test.com',
  createdAt: '2024-01-01T00:00:00Z',
  addresses: [
    {
      id: 'a-1',
      street: 'Rua das Flores',
      number: '123',
      complement: 'Apto 4',
      district: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01000-000',
      isDefault: true,
    },
  ],
}

const server = setupServer(
  http.get('/api/admin/customers/:id', ({ params }) =>
    params.id === 'c-1'
      ? HttpResponse.json(mockDetail)
      : HttpResponse.json({ message: 'Not found' }, { status: 404 }),
  ),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  replaceMock.mockClear()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({
    accessToken: 'mock-token',
    isAuthenticated: true,
    user: { id: 'u-1', name: 'Func', email: 'func@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_CUSTOMERS'] },
  })
})

function renderDetail(id = 'c-1') {
  return render(
    <ToastProvider>
      <CustomerDetailContent id={id} />
    </ToastProvider>,
  )
}

describe('CustomerDetailContent', () => {
  it('exibe nome e email do cliente', async () => {
    renderDetail()
    expect(await screen.findByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('joao@test.com')).toBeInTheDocument()
  })

  it('exibe endereço com rua, número, bairro, cidade, estado e CEP', async () => {
    renderDetail()
    await screen.findByText('João Silva')
    expect(screen.getByText(/rua das flores.*123/i)).toBeInTheDocument()
    expect(screen.getByText(/centro.*são paulo.*sp/i)).toBeInTheDocument()
    expect(screen.getByText(/01000-000/i)).toBeInTheDocument()
  })

  it('exibe link "← Voltar" para /dashboard/customers', async () => {
    renderDetail()
    const link = await screen.findByRole('link', { name: /voltar/i })
    expect(link).toHaveAttribute('href', '/dashboard/customers')
  })

  it('exibe mensagem de erro quando cliente não é encontrado', async () => {
    renderDetail('nao-existe')
    expect(await screen.findByText(/não encontrado/i)).toBeInTheDocument()
  })

  it('redireciona para /dashboard quando usuário não tem MANAGE_CUSTOMERS', async () => {
    useAuthStore.setState({
      accessToken: 'tok',
      isAuthenticated: true,
      user: { id: '1', name: 'Func', email: 'f@test.com', role: 'EMPLOYEE', permissions: ['MANAGE_ORDERS'] },
    })
    await act(async () => {
      render(<ToastProvider><CustomerDetailContent id="c-1" /></ToastProvider>)
    })
    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
  })
})
