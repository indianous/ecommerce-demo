import { period } from '../paging'
import { ok, type Route } from '../types'

const rate = (numerator: number, denominator: number) => (denominator === 0 ? 0 : numerator / denominator)
const DIRECT = 'Direto/não identificado'

export const analyticsRoutes: Route[] = [
  {
    method: 'GET',
    pattern: '/admin/analytics/funnel',
    handler: (ctx) => {
      const [from, to] = period(ctx.query, ctx.now)
      const within = (iso: string) => {
        const ms = Date.parse(iso)
        return ms >= from && ms <= to
      }
      const views = ctx.data.pageViews.filter((v) => within(v.viewedAt))
      const orders = ctx.data.orders.filter((o) => within(o.createdAt))
      const visitors = new Set(views.map((v) => v.sessionId)).size
      const productViews = new Set(views.filter((v) => v.productId).map((v) => v.sessionId)).size
      const cartAdds = new Set(ctx.data.cartAddEvents.filter((e) => within(e.createdAt)).map((e) => e.userId)).size
      const checkoutsStarted = new Set(orders.map((o) => o.userId)).size
      const purchasesCompleted = new Set(orders.filter((o) => o.paymentStatus === 'PAID').map((o) => o.userId)).size
      return ok({
        visitors,
        productViews,
        cartAdds,
        checkoutsStarted,
        purchasesCompleted,
        visitorToProductViewRate: rate(productViews, visitors),
        productViewToCartAddRate: rate(cartAdds, productViews),
        cartAddToCheckoutRate: rate(checkoutsStarted, cartAdds),
        checkoutToPurchaseRate: rate(purchasesCompleted, checkoutsStarted),
      })
    },
  },
  {
    method: 'GET',
    pattern: '/admin/analytics/channels',
    handler: (ctx) => {
      const [from, to] = period(ctx.query, ctx.now)
      const groups = new Map<string, { signups: number; buyers: Set<string>; revenue: number; paidOrders: number }>()
      for (const user of ctx.data.users.filter((u) => u.role === 'CUSTOMER')) {
        const source = user.trafficSource
        const channel = source?.utmSource && source.utmMedium ? `${source.utmSource} / ${source.utmMedium}` : DIRECT
        const group = groups.get(channel) ?? { signups: 0, buyers: new Set<string>(), revenue: 0, paidOrders: 0 }
        group.signups++
        for (const order of ctx.data.orders) {
          const ms = Date.parse(order.createdAt)
          if (order.userId !== user.id || order.paymentStatus !== 'PAID' || ms < from || ms > to) continue
          group.buyers.add(user.id)
          group.revenue += order.totalAmount
          group.paidOrders++
        }
        groups.set(channel, group)
      }
      return ok(
        [...groups.entries()].map(([channel, g]) => ({
          channel,
          signups: g.signups,
          buyers: g.buyers.size,
          conversionRate: rate(g.buyers.size, g.signups),
          revenue: Math.round(g.revenue * 100) / 100,
          averageOrderValue: g.paidOrders === 0 ? 0 : Math.round((g.revenue / g.paidOrders) * 100) / 100,
        })),
      )
    },
  },
]
