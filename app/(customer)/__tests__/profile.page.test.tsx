import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import ProfilePage from '../profile/page'
import { useAuthStore } from '@/stores/auth.store'
import type { Address, User } from '@/types'

const mockUser: User = {
  id: 'user-1',
  name: 'João Victor',
  email: 'joao@test.com',
  role: 'CUSTOMER',
  permissions: [],
  phone: null,
  birthDate: null,
  gender: 'PREFIRO_NAO_DIZER', cpf: null, emailVerified: true,
}

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
afterEach(async () => {
  server.resetHandlers()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
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

    const nameInput = await screen.findByLabelText(/nome/i)
    expect(nameInput).toHaveValue('João Victor')
    expect(screen.getByLabelText(/email/i)).toHaveValue('joao@test.com')
  })

  it('saves updated user data', async () => {
    const user = userEvent.setup()
    renderProfilePage()

    await screen.findByDisplayValue('João Victor')

    const nameInput = screen.getByLabelText(/nome/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'João V. Silva')
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/dados atualizados/i)
  })

  it('renders the existing addresses', async () => {
    renderProfilePage()

    expect(await screen.findByText(/Rua das Flores/)).toBeInTheDocument()
  })

  it('adds a new address', async () => {
    const user = userEvent.setup()
    renderProfilePage()

    await screen.findByText(/Rua das Flores/)

    await user.type(screen.getByLabelText(/rua\/logradouro/i), 'Av. Paulista')
    await user.type(screen.getByLabelText(/número/i), '1000')
    await user.type(screen.getByLabelText(/bairro/i), 'Bela Vista')
    await user.type(screen.getByLabelText(/cidade/i), 'São Paulo')
    await user.type(screen.getByLabelText(/estado/i), 'SP')
    await user.type(screen.getByLabelText(/cep/i), '01310-200')
    await user.click(screen.getByRole('button', { name: /adicionar endereço/i }))

    expect(await screen.findByText(/Av\. Paulista/)).toBeInTheDocument()
  })

  it('atualiza campos do formulário com dados normalizados pelo servidor após salvar', async () => {
    server.use(
      http.patch('/api/auth/me', () =>
        HttpResponse.json({
          id: 'user-1',
          name: 'João Victor (Servidor)',
          email: 'joao.servidor@test.com',
          role: 'CUSTOMER',
        })
      )
    )

    const user = userEvent.setup()
    renderProfilePage()

    await screen.findByDisplayValue('João Victor')

    await user.clear(screen.getByLabelText(/nome/i))
    await user.type(screen.getByLabelText(/nome/i), 'qualquer coisa digitada')
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/nome/i)).toHaveValue('João Victor (Servidor)')
      expect(screen.getByLabelText(/email/i)).toHaveValue('joao.servidor@test.com')
    })
  })

  it('salva phone/birthDate/gender no PATCH /api/auth/me, sem age', async () => {
    let capturedBody: Record<string, unknown> | null = null
    server.use(
      http.patch('/api/auth/me', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...mockUser, ...capturedBody })
      }),
    )

    const user = userEvent.setup()
    renderProfilePage()

    await screen.findByDisplayValue('João Victor')

    await user.type(screen.getByLabelText(/telefone/i), '11999998888')
    await user.type(screen.getByLabelText(/data de nascimento/i), '1996-03-20')
    await user.selectOptions(screen.getByLabelText(/gênero/i), 'FEMININO')
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(capturedBody).not.toBeNull())
    expect(capturedBody).toMatchObject({
      phone: '11999998888',
      birthDate: '1996-03-20',
      gender: 'FEMININO',
    })
    expect(capturedBody).not.toHaveProperty('age')
  })

  it('popula formulário quando accessToken é setado após o mount (hidratação)', async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })

    renderProfilePage()

    expect(screen.queryByLabelText(/nome/i)).not.toBeInTheDocument()
    expect(screen.getByText(/precisa entrar na sua conta/i)).toBeInTheDocument()

    act(() => {
      useAuthStore.setState({ accessToken: 'mock-token', isAuthenticated: true })
    })

    await screen.findByDisplayValue('João Victor')
  })
})

describe('ProfilePage — troca de e-mail (plano 64)', () => {
  it('salvar com e-mail novo → toast do link enviado e o store fica não verificado', async () => {
    server.use(http.patch('/api/auth/me', async ({ request }) =>
      HttpResponse.json({ ...mockUser, ...(await request.json() as object), emailVerified: false })))
    const user = userEvent.setup()
    renderProfilePage()
    const emailInput = await screen.findByDisplayValue('joao@test.com')

    await user.clear(emailInput)
    await user.type(emailInput, 'joao.novo@test.com')
    expect(screen.getByText('Você vai precisar confirmar o novo e-mail antes do próximo pedido')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText('Enviamos um link de confirmação para joao.novo@test.com')).toBeInTheDocument()
    expect(useAuthStore.getState().user?.emailVerified).toBe(false)
  })
})

