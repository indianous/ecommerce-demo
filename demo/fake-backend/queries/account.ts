import type { DemoData, DemoUser } from '../../generator/generate'
import { paginate } from '../paging'
import { addressOut, customerOrderOut, omit, productOut, userOut } from '../present'
import { ok, type Route } from '../types'

/** Carrinho do usuário no formato do `CartResponse` do backend, com o preço atual de cada produto. */
export function cartOf(user: DemoUser, data: DemoData) {
  const items = data.carts
    .filter((c) => c.userId === user.id)
    .map((c) => {
      const product = data.products.find((p) => p.id === c.productId)!
      return {
        productId: product.id,
        productName: product.name,
        imageUrl: product.imageUrls[0] ?? null,
        unitPrice: product.effectivePrice,
        quantity: c.quantity,
        subtotal: Math.round(product.effectivePrice * c.quantity * 100) / 100,
      }
    })
  return { items, total: Math.round(items.reduce((acc, i) => acc + i.subtotal, 0) * 100) / 100 }
}

export const accountRoutes: Route[] = [
  { method: 'GET', pattern: '/users/me', handler: (ctx) => ok(userOut(ctx.user!)) },
  {
    method: 'GET',
    pattern: '/addresses',
    handler: (ctx) => ok(ctx.data.addresses.filter((a) => a.userId === ctx.user!.id).map(addressOut)),
  },
  {
    method: 'GET',
    pattern: '/orders',
    handler: (ctx) => ok(paginate(ctx.data.orders.filter((o) => o.userId === ctx.user!.id).map(customerOrderOut), ctx.query, 10)),
  },
  { method: 'GET', pattern: '/cart', handler: (ctx) => ok(cartOf(ctx.user!, ctx.data)) },
  {
    method: 'GET',
    pattern: '/wishlist',
    handler: (ctx) =>
      ok(
        ctx.data.wishlist
          .filter((w) => w.userId === ctx.user!.id)
          .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
          .map((w) => productOut(ctx.data.products.find((p) => p.id === w.productId)!, ctx.data, ctx.user)),
      ),
  },
  {
    method: 'GET',
    pattern: '/reviews/me',
    handler: (ctx) => {
      const delivered = ctx.data.orders.filter((o) => o.userId === ctx.user!.id && o.status === 'DELIVERED')
      const productIds = [...new Set(delivered.flatMap((o) => o.items.map((i) => i.productId)))]
      return ok(
        productIds.map((productId) => {
          const product = ctx.data.products.find((p) => p.id === productId)!
          return {
            productId,
            productName: product.name,
            productImageUrl: product.imageUrls[0],
            review: ctx.data.reviews.find((r) => r.productId === productId && r.userId === ctx.user!.id) ?? null,
          }
        }),
      )
    },
  },
  {
    method: 'GET',
    pattern: '/notifications',
    handler: (ctx) =>
      ok(paginate(ctx.data.notifications.filter((n) => n.userId === ctx.user!.id).map((n) => omit(n, 'userId')), ctx.query)),
  },
  {
    method: 'GET',
    pattern: '/notifications/unread-count',
    handler: (ctx) => ok({ count: ctx.data.notifications.filter((n) => n.userId === ctx.user!.id && n.readAt === null).length }),
  },
]
