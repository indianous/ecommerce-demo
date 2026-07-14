import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { useAuthStore } from '../auth.store'

const server = setupServer(
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }
    if (body.email === 'valid@test.com' && body.password === 'pass123') {
      return HttpResponse.json({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        tokenType: 'Bearer',
        expiresIn: 900,
      })
    }
    return HttpResponse.json({ message: 'Credenciais inválidas' }, { status: 401 })
  }),
  http.post('/api/auth/register', async ({ request }) => {
    const body = (await request.json()) as { email: string }
    if (body.email === 'taken@test.com') {
      return HttpResponse.json({ message: 'Email já cadastrado' }, { status: 409 })
    }
    return HttpResponse.json(
      { accessToken: 'new-token', refreshToken: 'new-refresh', tokenType: 'Bearer', expiresIn: 900 },
      { status: 201 }
    )
  }),
  http.post('/api/auth/logout', () => new HttpResponse(null, { status: 204 }))
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  // Reset full state — isAuthenticated must also be cleared
  useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
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
})
