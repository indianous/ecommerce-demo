import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { RegisterForm } from '../RegisterForm'

const server = setupServer(
  http.post('/api/auth/register', async ({ request }) => {
    const body = (await request.json()) as { email: string }
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
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('RegisterForm', () => {
  it('renders name, email and password fields', () => {
    render(<RegisterForm onSuccess={() => {}} />)

    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^senha/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cadastrar/i })).toBeInTheDocument()
  })

  it('shows required errors when form is submitted empty', async () => {
    const user = userEvent.setup()
    render(<RegisterForm onSuccess={() => {}} />)

    await user.click(screen.getByRole('button', { name: /cadastrar/i }))

    await waitFor(() => {
      expect(screen.getByText(/nome é obrigatório/i)).toBeInTheDocument()
    })
  })

  it('shows error when email is already taken', async () => {
    const user = userEvent.setup()
    render(<RegisterForm onSuccess={() => {}} />)

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
    render(<RegisterForm onSuccess={onSuccess} />)

    await user.type(screen.getByLabelText(/nome/i), 'João Victor')
    await user.type(screen.getByLabelText(/email/i), 'new@test.com')
    await user.type(screen.getByLabelText(/^senha/i), 'SecurePass123!')
    await user.click(screen.getByRole('button', { name: /cadastrar/i }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
  })
})
