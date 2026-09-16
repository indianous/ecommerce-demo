import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { useAuthStore } from '../auth.store'

const mockUser = { id: 'user-1', name: 'João Victor', email: 'valid@test.com', role: 'CUSTOMER' }

const server = setupServer(
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }
    if (body.email === 'valid@test.com' && body.password === 'pass123') {
      return HttpResponse.json({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        tokenType: 'Bearer',
        expiresIn: 900,
        role: 'CUSTOMER',
      })
    }
    return HttpResponse.json({ message: 'Credenciais inválidas' }, { status: 401 })
  }),
  http.post('/api/auth/register', async ({ request }) => {
    const body = (await request.json()) as { name: string; email: string }
    if (body.email === 'taken@test.com') {
      return HttpResponse.json({ message: 'Email já cadastrado' }, { status: 409 })
    }
    return HttpResponse.json(
      { accessToken: 'new-token', refreshToken: 'new-refresh', tokenType: 'Bearer', expiresIn: 900, role: 'CUSTOMER' },
      { status: 201 }
    )
  }),
  http.post('/api/auth/refresh', () =>
    HttpResponse.json({ accessToken: 'hydrated-token', tokenType: 'Bearer', expiresIn: 900, role: 'CUSTOMER' })
  ),
  http.post('/api/auth/logout', () => new HttpResponse(null, { status: 204 })),
  http.get('/api/auth/me', ({ request }) => {
    const auth = request.headers.get('Authorization')
    if (!auth) return new HttpResponse(null, { status: 401 })
    if (auth.includes('new-token')) {
      return HttpResponse.json({ id: 'user-2', name: 'Novo Usuário', email: 'new@test.com', role: 'CUSTOMER' })
    }
    return HttpResponse.json(mockUser)
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
})
afterAll(() => server.close())

// Helpers — access store directly (no renderHook needed for a Zustand store)
const getStore = () => useAuthStore.getState()

describe('AuthStore', () => {
  describe('initial state', () => {
    it('starts with no token and unauthenticated', () => {
      expect(getStore().accessToken).toBeNull()
      expect(getStore().user).toBeNull()
      expect(getStore().isAuthenticated).toBe(false)
    })
  })

  describe('login', () => {
    it('stores accessToken in memory after successful login', async () => {
      await getStore().login({ email: 'valid@test.com', password: 'pass123' })

      expect(getStore().accessToken).toBe('mock-access-token')
      expect(getStore().isAuthenticated).toBe(true)
    })

    it('never stores accessToken in localStorage (XSS prevention)', async () => {
      await getStore().login({ email: 'valid@test.com', password: 'pass123' })

      expect(localStorage.getItem('accessToken')).toBeNull()
      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('session')).toBeNull()
    })

    it('throws on invalid credentials and does NOT set authenticated', async () => {
      await expect(
        getStore().login({ email: 'wrong@test.com', password: 'bad' })
      ).rejects.toThrow()

      expect(getStore().accessToken).toBeNull()
      expect(getStore().isAuthenticated).toBe(false)
    })
  })

  describe('register', () => {
    it('sets token after successful registration', async () => {
      await getStore().register({ name: 'João Victor', email: 'new@test.com', password: 'SecurePass123!' })

      expect(getStore().accessToken).toBe('new-token')
      expect(getStore().isAuthenticated).toBe(true)
    })

    it('throws when email is already taken', async () => {
      await expect(
        getStore().register({ name: 'Test', email: 'taken@test.com', password: 'SecurePass123!' })
      ).rejects.toThrow()
    })
  })

  describe('logout', () => {
    it('clears token and user on logout', async () => {
      await getStore().login({ email: 'valid@test.com', password: 'pass123' })
      expect(getStore().isAuthenticated).toBe(true)

      getStore().logout()

      expect(getStore().accessToken).toBeNull()
      expect(getStore().user).toBeNull()
      expect(getStore().isAuthenticated).toBe(false)
    })
  })

  describe('user population', () => {
    it('login(): seta user no store após autenticação', async () => {
      await getStore().login({ email: 'valid@test.com', password: 'pass123' })

      expect(getStore().user).not.toBeNull()
      expect(getStore().user?.name).toBe('João Victor')
      expect(getStore().user?.email).toBe('valid@test.com')
    })

    it('register(): seta user no store após cadastro', async () => {
      await getStore().register({ name: 'Novo Usuário', email: 'new@test.com', password: 'SecurePass123!' })

      expect(getStore().user).not.toBeNull()
      expect(getStore().user?.name).toBe('Novo Usuário')
      expect(getStore().user?.email).toBe('new@test.com')
    })

    it('hydrateSession(): seta user após refresh de sessão', async () => {
      await getStore().hydrateSession()

      expect(getStore().user).not.toBeNull()
      expect(getStore().user?.name).toBe('João Victor')
    })
  })

  describe('refreshAccessToken', () => {
    it('sucesso: devolve o token novo e atualiza accessToken/role, sem tocar user', async () => {
      const token = await getStore().refreshAccessToken()

      expect(token).toBe('hydrated-token')
      expect(getStore().accessToken).toBe('hydrated-token')
      expect(getStore().isAuthenticated).toBe(true)
      expect(getStore().user).toBeNull()
    })

    it('falha (refresh 401): devolve null e limpa o estado de auth', async () => {
      server.use(http.post('/api/auth/refresh', () => new HttpResponse(null, { status: 401 })))

      const token = await getStore().refreshAccessToken()

      expect(token).toBeNull()
      expect(getStore().accessToken).toBeNull()
      expect(getStore().isAuthenticated).toBe(false)
    })
  })
})
