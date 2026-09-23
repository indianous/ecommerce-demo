import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { authFetch } from '../authFetch'
import { useAuthStore } from '@/stores/auth.store'

let refreshCallCount = 0
let refreshShouldSucceed = true

const server = setupServer(
  http.post('/api/auth/refresh', () => {
    refreshCallCount++
    if (refreshShouldSucceed) {
      return HttpResponse.json({ accessToken: 'fresh-token', tokenType: 'Bearer', expiresIn: 900, role: 'CUSTOMER' })
    }
    return new HttpResponse(null, { status: 401 })
  }),
)

function setLocation(pathname: string, search = '') {
  const original = window.location
  Object.defineProperty(window, 'location', {
    value: { ...original, pathname, search, href: `http://localhost${pathname}${search}` },
    writable: true,
    configurable: true,
  })
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  refreshCallCount = 0
  refreshShouldSucceed = true
  setLocation('/dashboard/orders', '')
  useAuthStore.setState({ accessToken: 'stale-token', isAuthenticated: true, role: 'CUSTOMER', user: null })
})
afterEach(() => {
  server.resetHandlers()
  useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
})
afterAll(() => server.close())

describe('authFetch', () => {
  it('200 na primeira tentativa: devolve a resposta, sem chamar refresh', async () => {
    server.use(http.get('/api/orders', () => HttpResponse.json({ ok: true })))

    const res = await authFetch('/api/orders')

    expect(res.status).toBe(200)
    expect(refreshCallCount).toBe(0)
  })

  it('injeta o header Authorization sozinho a partir do accessToken do store', async () => {
    let receivedAuth: string | null = null
    server.use(
      http.get('/api/orders', ({ request }) => {
        receivedAuth = request.headers.get('Authorization')
        return HttpResponse.json({ ok: true })
      }),
    )

    await authFetch('/api/orders')

    expect(receivedAuth).toBe('Bearer stale-token')
  })

  it('401 na primeira tentativa, refresh com sucesso: repete a requisição com o token novo e devolve a segunda resposta', async () => {
    let callCount = 0
    let lastAuth: string | null = null
    server.use(
      http.get('/api/orders', ({ request }) => {
        callCount++
        lastAuth = request.headers.get('Authorization')
        if (callCount === 1) return new HttpResponse(null, { status: 401 })
        return HttpResponse.json({ ok: true, attempt: callCount })
      }),
    )

    const res = await authFetch('/api/orders')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true, attempt: 2 })
    expect(callCount).toBe(2)
    expect(lastAuth).toBe('Bearer fresh-token')
    expect(refreshCallCount).toBe(1)
  })

  it('401 na primeira tentativa, refresh também falha: não retenta de novo, limpa o auth store e redireciona pro login', async () => {
    refreshShouldSucceed = false
    server.use(http.get('/api/orders', () => new HttpResponse(null, { status: 401 })))

    let resolved = false
    authFetch('/api/orders').then(() => { resolved = true })

    await vi.waitFor(() => expect(refreshCallCount).toBe(1))
    await new Promise((r) => setTimeout(r, 0))

    expect(resolved).toBe(false)
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(window.location.href).toContain('/login')
    expect(window.location.href).toContain('callbackUrl=%2Fdashboard%2Forders')
    expect(window.location.href).toContain('sessionExpired=1')
  })

  it('duas chamadas simultâneas recebendo 401: só um POST /api/auth/refresh é disparado (dedupe)', async () => {
    let callCount = 0
    server.use(
      http.get('/api/orders', () => {
        callCount++
        if (callCount <= 2) return new HttpResponse(null, { status: 401 })
        return HttpResponse.json({ ok: true })
      }),
    )

    const [res1, res2] = await Promise.all([authFetch('/api/orders'), authFetch('/api/orders')])

    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
    expect(refreshCallCount).toBe(1)
  })

  it('hydrateSession em andamento + authFetch recebendo 401: só um POST /api/auth/refresh', async () => {
    useAuthStore.setState({ accessToken: null, isAuthenticated: false })
    let callCount = 0
    server.use(
      http.get('/api/auth/me', () => HttpResponse.json({ id: 'u1', name: 'Ana', email: 'a@test.com', role: 'CUSTOMER' })),
      http.get('/api/orders', () => {
        callCount++
        if (callCount === 1) return new HttpResponse(null, { status: 401 })
        return HttpResponse.json({ ok: true })
      }),
    )

    const [, res] = await Promise.all([useAuthStore.getState().hydrateSession(), authFetch('/api/orders')])

    expect(res.status).toBe(200)
    expect(refreshCallCount).toBe(1)
  })

  it('erro não-401 (500): nenhum retry, propaga a resposta normalmente', async () => {
    server.use(http.get('/api/orders', () => new HttpResponse(null, { status: 500 })))

    const res = await authFetch('/api/orders')

    expect(res.status).toBe(500)
    expect(refreshCallCount).toBe(0)
  })

  it('network error: propaga o erro, sem retry', async () => {
    server.use(http.get('/api/orders', () => HttpResponse.error()))

    await expect(authFetch('/api/orders')).rejects.toThrow()
    expect(refreshCallCount).toBe(0)
  })
})
