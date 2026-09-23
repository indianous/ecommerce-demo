import { describe, expect, it } from 'vitest'
import { homeFor, requiredRole } from '../route-access'

describe('requiredRole', () => {
  it.each(['/cart', '/orders', '/orders/123', '/profile', '/reviews'])('%s → CUSTOMER', (pathname) => {
    expect(requiredRole(pathname)).toBe('CUSTOMER')
  })

  it.each(['/dashboard/admin', '/dashboard/admin/orders/1'])('%s → ADMIN', (pathname) => {
    expect(requiredRole(pathname)).toBe('ADMIN')
  })

  it.each(['/dashboard', '/dashboard/orders', '/products', '/products/1'])('%s → EMPLOYEE', (pathname) => {
    expect(requiredRole(pathname)).toBe('EMPLOYEE')
  })

  it.each(['/', '/catalog', '/catalog/camiseta', '/login', '/checkout'])('%s → pública (null)', (pathname) => {
    expect(requiredRole(pathname)).toBeNull()
  })
})

describe('homeFor', () => {
  it('ADMIN → /dashboard/admin', () => expect(homeFor('ADMIN')).toBe('/dashboard/admin'))
  it('EMPLOYEE → /dashboard', () => expect(homeFor('EMPLOYEE')).toBe('/dashboard'))
  it('CUSTOMER → /', () => expect(homeFor('CUSTOMER')).toBe('/'))
  it('sem papel → /', () => expect(homeFor(null)).toBe('/'))
})
