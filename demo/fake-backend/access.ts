import type { Access } from './types'

const AUTH_PREFIXES = ['/users', '/cart', '/orders', '/wishlist', '/notifications', '/reviews/me', '/addresses', '/upload', '/shipping']
const ADMIN_PREFIXES = ['/admin/admins', '/admin/audit-logs']

const startsWith = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`)

/** Quem pode chamar a rota, pelas mesmas regras do SecurityConfig do backend (por prefixo). */
export function requiredAccess(method: string, path: string): Access {
  if (ADMIN_PREFIXES.some((p) => startsWith(path, p))) return 'admin'
  if (startsWith(path, '/admin')) return 'staff'
  if (startsWith(path, '/site') && method !== 'GET') return 'staff'
  if (AUTH_PREFIXES.some((p) => startsWith(path, p))) return 'auth'
  if (path === '/auth/verify-email/resend') return 'auth'
  if (/^\/products\/[^/]+\/reviews/.test(path) && method !== 'GET') return 'auth'
  return 'public'
}
