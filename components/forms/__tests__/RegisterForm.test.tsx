import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { RegisterForm } from '../RegisterForm'

function renderRegisterForm(props: React.ComponentProps<typeof RegisterForm>) {
  return render(
    <ToastProvider>
      <RegisterForm {...props} />
      <ToastViewport />
    </ToastProvider>,
  )
}

let lastRequestBody: Record<string, unknown> | null = null

const server = setupServer(
  http.post('/api/auth/register', async ({ request }) => {
    const body = (await request.json()) as { email: string }
    lastRequestBody = body
    if (body.email === 'taken@test.com') {
      return HttpResponse.json({ message: 'Email já cadastrado' }, { status: 409 })
    }
    return HttpResponse.json(
      { accessToken: 'token', refreshToken: 'refresh', tokenType: 'Bearer', expiresIn: 900 },
      { status: 201 }
    )
  })
)

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  lastRequestBody = null
})
afterAll(() => server.close())

describe('RegisterForm', () => {
  it('renders name, email and password fields', () => {
    renderRegisterForm({ onSuccess: () => {} })

    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^senha/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cadastrar/i })).toBeInTheDocument()
  })

  it('shows required errors when form is submitted empty', async () => {
    const user = userEvent.setup()
    renderRegisterForm({ onSuccess: () => {} })

    await user.click(screen.getByRole('button', { name: /cadastrar/i }))

    await waitFor(() => {
      expect(screen.getByText(/nome é obrigatório/i)).toBeInTheDocument()
    })
  })

  it('shows error when email is already taken', async () => {
    const user = userEvent.setup()
    renderRegisterForm({ onSuccess: () => {} })

    await user.type(screen.getByLabelText(/nome/i), 'João Victor')
    await user.type(screen.getByLabelText(/email/i), 'taken@test.com')
    await user.type(screen.getByLabelText(/^senha/i), 'SecurePass123!')
    await user.click(screen.getByRole('button', { name: /cadastrar/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/email já cadastrado/i)
    })
  })

  it('calls onSuccess after successful registration', async () => {
    const onSuccess = vi.fn()
    const user = userEvent.setup()
    renderRegisterForm({ onSuccess })

    await user.type(screen.getByLabelText(/nome/i), 'João Victor')
    await user.type(screen.getByLabelText(/email/i), 'new@test.com')
    await user.type(screen.getByLabelText(/^senha/i), 'SecurePass123!')
    await user.click(screen.getByRole('button', { name: /cadastrar/i }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
  })

  // ── Dados pessoais (fase 21) ───────────────────────────────────────────────

  it('renders phone, birth date and gender fields as optional', () => {
    renderRegisterForm({ onSuccess: () => {} })

    expect(screen.getByLabelText(/telefone/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/data de nascimento/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/gênero/i)).toBeInTheDocument()
  })

  it('includes phone, birthDate and gender in the payload when filled', async () => {
    const user = userEvent.setup()
    renderRegisterForm({ onSuccess: () => {} })

    await user.type(screen.getByLabelText(/nome/i), 'João Victor')
    await user.type(screen.getByLabelText(/email/i), 'new@test.com')
    await user.type(screen.getByLabelText(/^senha/i), 'SecurePass123!')
    await user.type(screen.getByLabelText(/telefone/i), '11999998888')
    await user.type(screen.getByLabelText(/data de nascimento/i), '1996-03-20')
    await user.selectOptions(screen.getByLabelText(/gênero/i), 'FEMININO')
    await user.click(screen.getByRole('button', { name: /cadastrar/i }))

    await waitFor(() => expect(lastRequestBody).not.toBeNull())
    expect(lastRequestBody).toMatchObject({
      phone: '11999998888',
      birthDate: '1996-03-20',
      gender: 'FEMININO',
    })
  })

  it('submits successfully without phone, birthDate or gender filled', async () => {
    const onSuccess = vi.fn()
    const user = userEvent.setup()
    renderRegisterForm({ onSuccess })

    await user.type(screen.getByLabelText(/nome/i), 'João Victor')
    await user.type(screen.getByLabelText(/email/i), 'new@test.com')
    await user.type(screen.getByLabelText(/^senha/i), 'SecurePass123!')
    await user.click(screen.getByRole('button', { name: /cadastrar/i }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    expect(lastRequestBody?.gender).toBeFalsy()
  })

  // ── Origem de tráfego (fase 25) ─────────────────────────────────────────────

  it('inclui os campos de UTM lidos do cookie no payload de cadastro', async () => {
    document.cookie = `traffic_attribution=${encodeURIComponent(
      JSON.stringify({ utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'black-friday', referrer: 'https://google.com', landingPage: '/catalog' }),
    )}; path=/`

    const user = userEvent.setup()
    renderRegisterForm({ onSuccess: () => {} })

    await user.type(screen.getByLabelText(/nome/i), 'João Victor')
    await user.type(screen.getByLabelText(/email/i), 'new@test.com')
    await user.type(screen.getByLabelText(/^senha/i), 'SecurePass123!')
    await user.click(screen.getByRole('button', { name: /cadastrar/i }))

    await waitFor(() => expect(lastRequestBody).not.toBeNull())
    expect(lastRequestBody).toMatchObject({
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'black-friday',
      referrer: 'https://google.com',
      landingPage: '/catalog',
    })

    document.cookie = 'traffic_attribution=; path=/; max-age=0'
  })

  it('sem cookie de atribuição, envia o cadastro sem quebrar e sem campos de UTM', async () => {
    const onSuccess = vi.fn()
    const user = userEvent.setup()
    renderRegisterForm({ onSuccess })

    await user.type(screen.getByLabelText(/nome/i), 'João Victor')
    await user.type(screen.getByLabelText(/email/i), 'new@test.com')
    await user.type(screen.getByLabelText(/^senha/i), 'SecurePass123!')
    await user.click(screen.getByRole('button', { name: /cadastrar/i }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    expect(lastRequestBody?.utmSource).toBeFalsy()
  })
})
