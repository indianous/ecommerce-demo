import { describe, expect, it } from 'vitest'
import { postLoginPath } from '../post-login-path'

describe('postLoginPath', () => {
  it('sem callbackUrl → página inicial do papel', () => {
    expect(postLoginPath(null, 'ADMIN')).toBe('/dashboard/admin')
    expect(postLoginPath('', 'EMPLOYEE')).toBe('/dashboard')
    expect(postLoginPath(null, 'CUSTOMER')).toBe('/')
  })

  it('caminho permitido para o papel → devolve o caminho com a query', () => {
    expect(postLoginPath('/orders?page=2', 'CUSTOMER')).toBe('/orders?page=2')
    expect(postLoginPath('/dashboard/orders', 'EMPLOYEE')).toBe('/dashboard/orders')
    expect(postLoginPath('/dashboard/admin/orders/1', 'ADMIN')).toBe('/dashboard/admin/orders/1')
  })

  it.each(['https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', 'evil.com'])(
    'recusa destino fora do site (%s) → página inicial do papel',
    (callbackUrl) => {
      expect(postLoginPath(callbackUrl, 'CUSTOMER')).toBe('/')
    },
  )

  it.each([
    ['/dashboard/orders', 'CUSTOMER', '/'],
    ['/cart', 'ADMIN', '/dashboard/admin'],
    ['/dashboard/admin/orders', 'EMPLOYEE', '/dashboard'],
    ['/dashboard/orders', 'ADMIN', '/dashboard/admin'],
  ] as const)('rota de outro papel (%s como %s) → %s', (callbackUrl, role, expected) => {
    expect(postLoginPath(callbackUrl, role)).toBe(expected)
  })

  it.each(['/login', '/register', '/login?callbackUrl=%2Forders'])('%s → página inicial do papel', (callbackUrl) => {
    expect(postLoginPath(callbackUrl, 'EMPLOYEE')).toBe('/dashboard')
  })

  it('rota pública vale para qualquer papel', () => {
    expect(postLoginPath('/catalog/camiseta', 'ADMIN')).toBe('/catalog/camiseta')
    expect(postLoginPath('/catalog/camiseta', 'CUSTOMER')).toBe('/catalog/camiseta')
  })
})
