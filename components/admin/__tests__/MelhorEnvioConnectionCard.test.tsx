import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider, ToastViewport } from '@indianous/base-ds'
import { MelhorEnvioConnectionCard } from '@/components/admin/MelhorEnvioConnectionCard'
import { useAuthStore } from '@/stores/auth.store'

let connected = false

const server = setupServer(
  http.get('/api/admin/site/melhor-envio', () => HttpResponse.json({ connected })),
  http.get('/api/admin/site/melhor-envio/oauth/authorize-url', () =>
    HttpResponse.json({ authorizeUrl: 'https://melhorenvio.com.br/oauth/authorize?client_id=1' }),
  ),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  connected = false
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'mock-token', isAuthenticated: true })
})

function renderCard() {
  return render(
    <ToastProvider>
      <MelhorEnvioConnectionCard />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('MelhorEnvioConnectionCard', () => {
  it('não conectado: mostra botão "Conectar Melhor Envio"', async () => {
    renderCard()

    expect(await screen.findByText('Não conectado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Conectar Melhor Envio' })).toBeInTheDocument()
  })

  it('clicar em "Conectar Melhor Envio" busca a URL de autorização e redireciona window.location', async () => {
    const originalLocation = window.location
    const fakeLocation = {
      href: originalLocation.href,
      origin: originalLocation.origin,
      protocol: originalLocation.protocol,
      host: originalLocation.host,
      hostname: originalLocation.hostname,
      port: originalLocation.port,
      pathname: originalLocation.pathname,
      search: originalLocation.search,
      hash: originalLocation.hash,
    }
    Object.defineProperty(window, 'location', { value: fakeLocation, configurable: true, writable: true })

    try {
      const user = userEvent.setup()
      renderCard()

      await user.click(await screen.findByRole('button', { name: 'Conectar Melhor Envio' }))

      await waitFor(() => {
        expect(fakeLocation.href).toBe('https://melhorenvio.com.br/oauth/authorize?client_id=1')
      })
    } finally {
      Object.defineProperty(window, 'location', { value: originalLocation, configurable: true, writable: true })
    }
  })

  it('conectado: mostra "Conectado" em vez do botão', async () => {
    connected = true
    renderCard()

    expect(await screen.findByText('Conectado')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Conectar Melhor Envio' })).not.toBeInTheDocument()
  })
})
