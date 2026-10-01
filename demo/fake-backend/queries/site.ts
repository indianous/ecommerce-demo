import { ok, type Route } from '../types'

export const siteRoutes: Route[] = [
  { method: 'GET', pattern: '/site/settings', handler: (ctx) => ok(ctx.data.settings) },
  { method: 'GET', pattern: '/site/banners', handler: (ctx) => ok([...ctx.data.banners].sort((a, b) => a.position - b.position)) },
  { method: 'GET', pattern: '/site/nav-items', handler: (ctx) => ok(ctx.data.navItems) },
  {
    method: 'GET',
    pattern: '/site/distribution-centers',
    // A equipe gerencia todos; a loja só mostra os ativos (retirada no checkout).
    handler: (ctx) => ok(ctx.user && ctx.user.role !== 'CUSTOMER' ? ctx.data.distributionCenters : ctx.data.distributionCenters.filter((c) => c.active)),
  },
  { method: 'GET', pattern: '/site/payment-methods', handler: (ctx) => ok(ctx.data.paymentMethods) },
  { method: 'GET', pattern: '/site/payment-gateway', handler: (ctx) => ok(ctx.data.paymentGateway) },
  { method: 'GET', pattern: '/admin/site/nav-items', handler: (ctx) => ok(ctx.data.navItems) },
  { method: 'GET', pattern: '/admin/site/melhor-envio', handler: (ctx) => ok({ connected: ctx.data.melhorEnvioConnected }) },
  {
    method: 'GET',
    pattern: '/admin/site/melhor-envio/oauth/authorize-url',
    handler: () => ok({ authorizeUrl: 'https://www.melhorenvio.com.br/' }),
  },
]
