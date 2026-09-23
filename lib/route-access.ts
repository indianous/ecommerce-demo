import type { UserRole } from '@/types'

// Regras de acesso por papel, compartilhadas entre o proxy e o login (plano #59).
const CUSTOMER_ROUTES = ['/cart', '/orders', '/profile', '/reviews']
const EMPLOYEE_ROUTES = ['/dashboard', '/products']
const ADMIN_ROUTES = ['/dashboard/admin']

const matches = (pathname: string, routes: string[]) => routes.some((r) => pathname.startsWith(r))

/** Papel exigido pela rota, ou null quando ela é pública. */
export function requiredRole(pathname: string): UserRole | null {
  if (matches(pathname, CUSTOMER_ROUTES)) return 'CUSTOMER'
  // As rotas de admin ficam dentro de /dashboard — checar antes das de funcionário
  if (matches(pathname, ADMIN_ROUTES)) return 'ADMIN'
  if (matches(pathname, EMPLOYEE_ROUTES)) return 'EMPLOYEE'
  return null
}

export function homeFor(role: UserRole | null): string {
  if (role === 'ADMIN') return '/dashboard/admin'
  if (role === 'EMPLOYEE') return '/dashboard'
  return '/'
}
