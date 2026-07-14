import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import ProfilePage from '../profile/page'
import { useAuthStore } from '@/stores/auth.store'
import type { Address, User } from '@/types'

const mockUser: User = { id: 'user-1', name: 'João Victor', email: 'joao@test.com', role: 'CUSTOMER' }

const mockAddress: Address = {
  id: 'addr-1',
  street: 'Rua das Flores',
  number: '123',
  district: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01310-100',
  isDefault: true,
}

const server = setupServer(
  http.get('/api/auth/me', () => HttpResponse.json(mockUser)),
  http.patch('/api/auth/me', async ({ request }) => HttpResponse.json({ ...mockUser, ...(await request.json() as object) })),
  http.get('/api/addresses', () => HttpResponse.json([mockAddress])),
  http.post('/api/addresses', async ({ request }) =>
    HttpResponse.json({ id: 'addr-2', isDefault: false, ...(await request.json() as object) }, { status: 201 }),
  ),
)

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'mock-token', isAuthenticated: true })
})

function renderProfilePage() {
  return render(
    <ToastProvider>
      <ProfilePage />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('ProfilePage', () => {
  it('loads and displays the current user data', async () => {
    renderProfilePage()

    await waitFor(() => {
      expect(screen.getByLabelText(/nome/i)).toHaveValue('João Victor')
    })
    expect(screen.getByLabelText(/email/i)).toHaveValue('joao@test.com')
  })

  it('saves updated user data', async () => {
    const user = userEvent.setup()
    renderProfilePage()

    await waitFor(() => expect(screen.getByLabelText(/nome/i)).toHaveValue('João Victor'))

    const nameInput = screen.getByLabelText(/nome/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'João V. Silva')
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/dados atualizados/i)
    })
  })

  it('renders the existing addresses', async () => {
    renderProfilePage()

    await waitFor(() => {
      expect(screen.getByText(/Rua das Flores/)).toBeInTheDocument()
    })
  })

  it('adds a new address', async () => {
    const user = userEvent.setup()
    renderProfilePage()

    await waitFor(() => expect(screen.getByText(/Rua das Flores/)).toBeInTheDocument())

    await user.type(screen.getByLabelText(/rua\/logradouro/i), 'Av. Paulista')
    await user.type(screen.getByLabelText(/número/i), '1000')
    await user.type(screen.getByLabelText(/bairro/i), 'Bela Vista')
    await user.type(screen.getByLabelText(/cidade/i), 'São Paulo')
    await user.type(screen.getByLabelText(/estado/i), 'SP')
    await user.type(screen.getByLabelText(/cep/i), '01310-200')
    await user.click(screen.getByRole('button', { name: /adicionar endereço/i }))

    await waitFor(() => {
      expect(screen.getByText(/Av\. Paulista/)).toBeInTheDocument()
    })
  })
})
