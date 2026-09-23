import type { UserRole } from '@/types'
import { homeFor, requiredRole } from './route-access'

const BASE = 'http://internal.invalid'
const AUTH_PAGES = ['/login', '/register']

/**
 * Destino depois do login: o callbackUrl, se for um caminho interno que o papel pode acessar;
 * senão, a página inicial do papel. Evita redirecionamento aberto (plano #59).
 */
export function postLoginPath(callbackUrl: string | null, role: UserRole | null): string {
  const home = homeFor(role)
  if (!callbackUrl || !callbackUrl.startsWith('/') || callbackUrl.startsWith('//') || callbackUrl.startsWith('/\\')) {
    return home
  }

  let url: URL
  try {
    url = new URL(callbackUrl, BASE)
  } catch {
    return home
  }
  if (url.origin !== BASE) return home
  if (AUTH_PAGES.includes(url.pathname)) return home

  const required = requiredRole(url.pathname)
  if (required && required !== role) return home

  return url.pathname + url.search + url.hash
}
