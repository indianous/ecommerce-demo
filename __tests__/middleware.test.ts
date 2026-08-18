import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { middleware } from '../middleware'

function makeRequest(pathname: string, cookies: Record<string, string> = {}) {
  const cookieHeader = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')
  return new NextRequest(new URL(pathname, 'http://localhost:3000'), {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  })
}

describe('middleware', () => {
  it('EMPLOYEE acessando /profile → redirect pra /', () => {
    const response = middleware(makeRequest('/profile', { session: 'tok', role: 'EMPLOYEE' }))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('ADMIN acessando /cart → redirect pra /', () => {
    const response = middleware(makeRequest('/cart', { session: 'tok', role: 'ADMIN' }))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('EMPLOYEE acessando /reviews → redirect pra /', () => {
    const response = middleware(makeRequest('/reviews', { session: 'tok', role: 'EMPLOYEE' }))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('ADMIN acessando /reviews → redirect pra /', () => {
    const response = middleware(makeRequest('/reviews', { session: 'tok', role: 'ADMIN' }))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })

  it.each(['/profile', '/cart', '/orders', '/reviews'])(
    'CUSTOMER acessando %s → sem redirect',
    (pathname) => {
      const response = middleware(makeRequest(pathname, { session: 'tok', role: 'CUSTOMER' }))
      expect(response.status).toBe(200)
      expect(response.headers.get('location')).toBeNull()
    },
  )

  it('sem sessão em /reviews → redirect pra /login?callbackUrl=...', () => {
    const response = middleware(makeRequest('/reviews'))
    expect(response.status).toBe(307)
    const location = new URL(response.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('callbackUrl')).toBe('/reviews')
  })

  it('EMPLOYEE em /dashboard → sem redirect', () => {
    const response = middleware(makeRequest('/dashboard', { session: 'tok', role: 'EMPLOYEE' }))
    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })

  it('ADMIN em /dashboard/admin → sem redirect', () => {
    const response = middleware(makeRequest('/dashboard/admin', { session: 'tok', role: 'ADMIN' }))
    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })
})
