import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { proxy } from '../proxy'

function makeRequest(pathname: string, cookies: Record<string, string> = {}) {
  const cookieHeader = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')
  return new NextRequest(new URL(pathname, 'http://localhost:3000'), {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  })
}

describe('proxy', () => {
  it('EMPLOYEE acessando /profile → redirect pra /', () => {
    const response = proxy(makeRequest('/profile', { session: 'tok', role: 'EMPLOYEE' }))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('ADMIN acessando /cart → redirect pra /', () => {
    const response = proxy(makeRequest('/cart', { session: 'tok', role: 'ADMIN' }))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('EMPLOYEE acessando /reviews → redirect pra /', () => {
    const response = proxy(makeRequest('/reviews', { session: 'tok', role: 'EMPLOYEE' }))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('ADMIN acessando /reviews → redirect pra /', () => {
    const response = proxy(makeRequest('/reviews', { session: 'tok', role: 'ADMIN' }))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })

  it.each(['/profile', '/cart', '/orders', '/reviews'])(
    'CUSTOMER acessando %s → sem redirect',
    (pathname) => {
      const response = proxy(makeRequest(pathname, { session: 'tok', role: 'CUSTOMER' }))
      expect(response.status).toBe(200)
      expect(response.headers.get('location')).toBeNull()
    },
  )

  it('sem sessão em /reviews → redirect pra /login?callbackUrl=...', () => {
    const response = proxy(makeRequest('/reviews'))
    expect(response.status).toBe(307)
    const location = new URL(response.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('callbackUrl')).toBe('/reviews')
  })

  it('EMPLOYEE em /dashboard → sem redirect', () => {
    const response = proxy(makeRequest('/dashboard', { session: 'tok', role: 'EMPLOYEE' }))
    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })

  it('ADMIN em /dashboard/admin → sem redirect', () => {
    const response = proxy(makeRequest('/dashboard/admin', { session: 'tok', role: 'ADMIN' }))
    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })
})

describe('proxy — páginas de senha e verificação de e-mail (plano 64)', () => {
  it.each(['/forgot-password', '/reset-password', '/verify-email'])('%s é pública, com ou sem sessão', (path) => {
    const sessions: Record<string, string>[] = [{}, { session: 'tok', role: 'CUSTOMER' }, { session: 'tok', role: 'EMPLOYEE' }]
    for (const cookies of sessions) {
      const response = proxy(makeRequest(path, cookies))
      expect(response.headers.get('location')).toBeNull()
    }
  })

  it('o matcher não inclui as páginas novas (o proxy nem roda nelas)', async () => {
    const { config } = await import('../proxy')
    expect(config.matcher.some((m) => /forgot|reset|verify/.test(m))).toBe(false)
  })
})
