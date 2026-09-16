import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { ChangePasswordForm } from '../ChangePasswordForm'

const mockAuthState = { accessToken: 'mock-token' }
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: Object.assign(
    (selector: (s: typeof mockAuthState) => unknown) => selector(mockAuthState),
    { getState: () => mockAuthState },
  ),
}))

function renderForm() {
  return render(
    <ToastProvider>
      <ChangePasswordForm />
      <ToastViewport />
    </ToastProvider>,
  )
}

const server = setupServer(
  http.patch('/api/auth/me/password', async ({ request }) => {
    const body = (await request.json()) as {
      currentPassword: string
      newPassword: string
      confirmPassword: string
    }

    if (body.currentPassword === 'senha-errada') {
      return HttpResponse.json({ message: 'Senha atual incorreta' }, { status: 400 })
    }
    if (body.newPassword !== body.confirmPassword) {
      return HttpResponse.json({ message: 'As senhas não coincidem' }, { status: 400 })
    }

    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('ChangePasswordForm', () => {
  it('renderiza os três campos e o botão de submit', () => {
    renderForm()

    expect(screen.getByLabelText(/senha atual/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Nova senha')).toBeInTheDocument()
    expect(screen.getByLabelText(/confirmar nova senha/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /alterar senha/i })).toBeInTheDocument()
  })

  it('exibe erro de validação quando os campos estão vazios', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: /alterar senha/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('exibe erro de validação quando as senhas não coincidem no cliente', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/senha atual/i), 'minhasenha123')
    await user.type(screen.getByLabelText('Nova senha'), 'novasenha123')
    await user.type(screen.getByLabelText(/confirmar nova senha/i), 'diferente456')
    await user.click(screen.getByRole('button', { name: /alterar senha/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/coincidem/i)
    })
  })

  it('exibe erro quando a senha atual está incorreta (API 400)', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/senha atual/i), 'senha-errada')
    await user.type(screen.getByLabelText('Nova senha'), 'novasenha123')
    await user.type(screen.getByLabelText(/confirmar nova senha/i), 'novasenha123')
    await user.click(screen.getByRole('button', { name: /alterar senha/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/incorreta/i)
    })
  })

  it('exibe toast de sucesso após alterar a senha com sucesso', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/senha atual/i), 'senhaCorreta123')
    await user.type(screen.getByLabelText('Nova senha'), 'novasenha123')
    await user.type(screen.getByLabelText(/confirmar nova senha/i), 'novasenha123')
    await user.click(screen.getByRole('button', { name: /alterar senha/i }))

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/senha alterada/i)
    })
  })

  it('limpa os campos após alterar a senha com sucesso', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/senha atual/i), 'senhaCorreta123')
    await user.type(screen.getByLabelText('Nova senha'), 'novasenha123')
    await user.type(screen.getByLabelText(/confirmar nova senha/i), 'novasenha123')
    await user.click(screen.getByRole('button', { name: /alterar senha/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/senha atual/i)).toHaveValue('')
      expect(screen.getByLabelText('Nova senha')).toHaveValue('')
      expect(screen.getByLabelText(/confirmar nova senha/i)).toHaveValue('')
    })
  })
})
