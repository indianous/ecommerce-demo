import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ToastProvider, ToastViewport } from '@indianous/base-ds'
import { PasswordInviteButton } from '../PasswordInviteButton'
import { useAuthStore } from '@/stores/auth.store'

let calledFor = ''
let authorization: string | null = null
const server = setupServer(
  http.post('/api/admin/users/:id/password-invite', ({ params, request }) => {
    calledFor = params.id as string
    authorization = request.headers.get('Authorization')
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  calledFor = ''
  authorization = null
  useAuthStore.setState({ accessToken: null })
})
afterAll(() => server.close())

function renderButton(props: Partial<React.ComponentProps<typeof PasswordInviteButton>> = {}) {
  useAuthStore.setState({ accessToken: 'tok' })
  return render(
    <ToastProvider>
      <PasswordInviteButton userId="u-1" email="ana@test.com" passwordSet canInvite {...props} />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('PasswordInviteButton', () => {
  it('conta com senha → "Enviar link de redefinição"', () => {
    renderButton()
    expect(screen.getByRole('button', { name: 'Enviar link de redefinição' })).toBeInTheDocument()
  })

  it('conta sem senha → "Enviar convite"', () => {
    renderButton({ passwordSet: false })
    expect(screen.getByRole('button', { name: 'Enviar convite' })).toBeInTheDocument()
  })

  it('sem permissão → não renderiza', () => {
    renderButton({ canInvite: false })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('clique → confirmação → POST autenticado → toast', async () => {
    const user = userEvent.setup()
    renderButton({ passwordSet: false })

    await user.click(screen.getByRole('button', { name: 'Enviar convite' }))
    const dialog = screen.getByRole('dialog', { name: 'Enviar convite' })
    expect(dialog).toHaveTextContent('ana@test.com')
    await user.click(within(dialog).getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('Link enviado para ana@test.com')).toBeInTheDocument()
    expect(calledFor).toBe('u-1')
    expect(authorization).toBe('Bearer tok')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('cancelar a confirmação não chama o backend', async () => {
    const user = userEvent.setup()
    renderButton()

    await user.click(screen.getByRole('button', { name: 'Enviar link de redefinição' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    expect(calledFor).toBe('')
  })

  it('403 → toast com a mensagem do backend', async () => {
    server.use(http.post('/api/admin/users/:id/password-invite', () =>
      HttpResponse.json({ status: 403, message: 'Sem permissão para enviar o link de senha a este usuário' }, { status: 403 })))
    const user = userEvent.setup()
    renderButton()

    await user.click(screen.getByRole('button', { name: 'Enviar link de redefinição' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('Sem permissão para enviar o link de senha a este usuário')).toBeInTheDocument()
  })
})
