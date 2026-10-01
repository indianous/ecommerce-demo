import type { DemoData } from '../generator/generate'
import { requiredAccess } from './access'
import { authRoutes, userFromToken } from './auth'
import { shiftedData } from './dates'
import { accountRoutes } from './queries/account'
import { adminCatalogRoutes } from './queries/admin-catalog'
import { adminOrderRoutes } from './queries/admin-orders'
import { adminPeopleRoutes } from './queries/admin-people'
import { analyticsRoutes } from './queries/analytics'
import { catalogRoutes } from './queries/catalog'
import { siteRoutes } from './queries/site'
import { notFound, type Context, type DemoRequest, type DemoResponse, type Route } from './types'
import { genericWrite, writeRoutes } from './writes'

interface CompiledRoute extends Route {
  segments: string[]
}

/** Rotas mais específicas primeiro: segmento fixo vence parâmetro na mesma posição (`/products/popular` antes de `/products/:id`). */
const ROUTES: CompiledRoute[] = [
  ...authRoutes,
  ...catalogRoutes,
  ...accountRoutes,
  ...adminCatalogRoutes,
  ...adminOrderRoutes,
  ...adminPeopleRoutes,
  ...siteRoutes,
  ...analyticsRoutes,
  ...writeRoutes,
]
  .map((route) => ({ ...route, segments: route.pattern.split('/').filter(Boolean) }))
  .sort((a, b) => {
    for (let i = 0; i < Math.min(a.segments.length, b.segments.length); i++) {
      const aParam = a.segments[i].startsWith(':')
      const bParam = b.segments[i].startsWith(':')
      if (aParam !== bParam) return aParam ? 1 : -1
    }
    return 0
  })

/** Todas as rotas registradas, no formato `MÉTODO /padrão` (usado pelo teste de cobertura). */
export const registeredRoutes = ROUTES.map((r) => `${r.method} ${r.pattern}`)

function match(method: string, path: string): { route: CompiledRoute; params: Record<string, string> } | null {
  const segments = path.split('/').filter(Boolean)
  for (const route of ROUTES) {
    if (route.method !== method || route.segments.length !== segments.length) continue
    const params: Record<string, string> = {}
    const hit = route.segments.every((segment, i) => {
      if (segment.startsWith(':')) {
        params[segment.slice(1)] = decodeURIComponent(segments[i])
        return true
      }
      return segment === segments[i]
    })
    if (hit) return { route, params }
  }
  return null
}

/**
 * Responde uma requisição como o backend real responderia, a partir do data.json, sem alterar nada.
 * As datas são deslocadas para que os dados pareçam sempre recentes (ver `dates.ts`).
 */
export function handle(req: DemoRequest, rawData: DemoData, now: number = Date.now()): DemoResponse {
  const data = shiftedData(rawData, now)
  const method = req.method.toUpperCase()
  const path = (`/${req.path.replace(/^\/?(api\/v1\/?)?/, '')}`).replace(/\/+$/, '') || '/'
  const authorization = req.headers.authorization ?? ''
  const user = userFromToken(authorization.startsWith('Bearer ') ? authorization.slice(7) : null, data)

  const access = requiredAccess(method, path)
  if (access !== 'public' && !user) return { status: 401 }
  if (access === 'staff' && user!.role === 'CUSTOMER') return { status: 403, body: { message: 'Acesso negado', status: 403 } }
  if (access === 'admin' && user!.role !== 'ADMIN') return { status: 403, body: { message: 'Acesso negado', status: 403 } }

  const found = match(method, path)
  const ctx: Context = { req: { ...req, method, path }, params: found?.params ?? {}, query: req.query, user, data, now }
  if (found) return found.route.handler(ctx)
  if (method === 'GET') return notFound()
  return genericWrite(ctx)
}
