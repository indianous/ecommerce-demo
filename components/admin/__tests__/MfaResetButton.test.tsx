import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { ToastProvider, ToastViewport } from '@indianous/base-ds'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth.store'
import { MfaResetButton } from '../MfaResetButton'

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderButton(props: Partial<React.ComponentProps<typeof MfaResetButton>> = {}) {
  useAuthStore.setState({ accessToken: 'tok', isAuthenticated: true })
  const onReset = vi.fn()
  render(
    <ToastProvider>
      <MfaResetButton userId="u-1" name="Ana" mfaEnabled canReset onReset={onReset} {...props} />
      <ToastViewport />
    </ToastProvider>,
  )
  return { onReset }
}

describe('MfaResetButton', () => {
  it('sem permissão ou sem 2FA ativo → não renderiza', () => {
    renderButton({ canReset: false })
    expect(screen.queryByRole('button', { name: /resetar 2fa/i })).not.toBeInTheDocument()
  })

  it('sem 2FA ativo → não renderiza (não há o que resetar)', () => {
    renderButton({ mfaEnabled: false })
    expect(screen.queryByRole('button', { name: /resetar 2fa/i })).not.toBeInTheDocument()
  })

  it('confirma explicando as consequências, faz o POST e avisa', async () => {
    let called = false
    server.use(
      http.post('/api/admin/users/u-1/mfa/reset', () => {
        called = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    const { onReset } = renderButton()

    await user.click(screen.getByRole('button', { name: /resetar 2fa/i }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/as sessões abertas de ana serão encerradas/i)).toBeInTheDocument()
    expect(within(dialog).getByText(/no próximo login/i)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /^resetar$/i }))

    await waitFor(() => expect(called).toBe(true))
    expect(await screen.findByText('Verificação em duas etapas de Ana resetada')).toBeInTheDocument()
    expect(onReset).toHaveBeenCalled()
  })

  it('403 → toast com a mensagem do backend', async () => {
    server.use(
      http.post('/api/admin/users/u-1/mfa/reset', () =>
        HttpResponse.json({ status: 403, message: 'Sem permissão para resetar' }, { status: 403 }),
      ),
    )
    const user = userEvent.setup()
    const { onReset } = renderButton()

    await user.click(screen.getByRole('button', { name: /resetar 2fa/i }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /^resetar$/i }))

    expect(await screen.findByText('Sem permissão para resetar')).toBeInTheDocument()
    expect(onReset).not.toHaveBeenCalled()
  })
})
