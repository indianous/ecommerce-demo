import type { ProductSort, ShippingQuoteResponse } from '@/types'
import type { DemoProduct } from '../../generator/generate'
import { contains, paginate } from '../paging'
import { productOut } from '../present'
import { bodyOf, notFound, ok, type Context, type Route } from '../types'

const visible = (ctx: Context) => ctx.data.products.filter((p) => p.active)
const out = (ctx: Context) => (p: DemoProduct) => productOut(p, ctx.data, ctx.user)
const limit = (ctx: Context, fallback: number) => Math.max(1, Number.parseInt(ctx.query.get('limit') ?? '', 10) || fallback)

const SORTS: Record<ProductSort, (a: DemoProduct, b: DemoProduct) => number> = {
  NAME_ASC: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
  PRICE_ASC: (a, b) => a.effectivePrice - b.effectivePrice || a.name.localeCompare(b.name, 'pt-BR'),
  PRICE_DESC: (a, b) => b.effectivePrice - a.effectivePrice || a.name.localeCompare(b.name, 'pt-BR'),
  NEWEST: (a, b) => b.createdAt.localeCompare(a.createdAt),
}

/** Opções de frete fixas: três serviços, grátis no PAC quando o produto tem frete grátis. */
export function shippingQuote(free: boolean): ShippingQuoteResponse {
  return {
    freeShipping: free,
    options: [
      { serviceId: '1', carrierName: 'Correios', serviceName: 'PAC', price: free ? 0 : 21.9, deliveryDays: 7 },
      { serviceId: '2', carrierName: 'Correios', serviceName: 'SEDEX', price: 34.9, deliveryDays: 3 },
      { serviceId: '17', carrierName: 'Jadlog', serviceName: '.Package', price: 26.5, deliveryDays: 5 },
    ],
  }
}

export const catalogRoutes: Route[] = [
  {
    method: 'GET',
    pattern: '/catalog/products',
    handler: (ctx) => {
      const { query } = ctx
      let list = visible(ctx)
      const category = query.get('category')
      if (category) {
        const found = ctx.data.categories.find((c) => c.slug === category)
        list = found ? list.filter((p) => p.categories.some((c) => c.id === found.id)) : []
      }
      const search = query.get('search')?.trim()
      if (search) list = list.filter((p) => contains(p.name, search) || contains(p.description, search))
      if (query.get('onSale') === 'true') list = list.filter((p) => p.onPromotion)
      const sort = (query.get('sort') as ProductSort) in SORTS ? (query.get('sort') as ProductSort) : 'NAME_ASC'
      return ok(paginate([...list].sort(SORTS[sort]).map(out(ctx)), query))
    },
  },
  {
    method: 'GET',
    pattern: '/catalog/products/popular',
    handler: (ctx) =>
      ok(visible(ctx).filter((p) => p.status === 'AVAILABLE').sort((a, b) => b.viewCount - a.viewCount).slice(0, limit(ctx, 8)).map(out(ctx))),
  },
  {
    method: 'GET',
    pattern: '/catalog/products/best-selling',
    handler: (ctx) =>
      ok(
        visible(ctx)
          .filter((p) => p.soldQuantityLast30Days > 0)
          .sort((a, b) => b.soldQuantityLast30Days - a.soldQuantityLast30Days)
          .slice(0, limit(ctx, 8))
          .map(out(ctx)),
      ),
  },
  {
    method: 'GET',
    pattern: '/catalog/products/slug/:slug',
    handler: (ctx) => {
      const product = visible(ctx).find((p) => p.slug === ctx.params.slug)
      return product ? ok(out(ctx)(product)) : notFound('Produto não encontrado')
    },
  },
  {
    method: 'GET',
    pattern: '/catalog/products/:id',
    handler: (ctx) => {
      const product = visible(ctx).find((p) => p.id === ctx.params.id)
      return product ? ok(out(ctx)(product)) : notFound('Produto não encontrado')
    },
  },
  {
    method: 'GET',
    pattern: '/catalog/products/:id/related',
    handler: (ctx) => {
      const origin = ctx.data.products.find((p) => p.id === ctx.params.id)
      if (!origin) return notFound('Produto não encontrado')
      const categoryId = origin.categories[0]?.id
      return ok(
        visible(ctx)
          .filter((p) => p.id !== origin.id && p.status === 'AVAILABLE' && p.categories[0]?.id === categoryId)
          .sort((a, b) => b.soldQuantityLast30Days - a.soldQuantityLast30Days || b.viewCount - a.viewCount)
          .slice(0, limit(ctx, 6))
          .map(out(ctx)),
      )
    },
  },
  {
    method: 'GET',
    pattern: '/catalog/categories',
    handler: (ctx) => ok([...ctx.data.categories].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))),
  },
  {
    method: 'POST',
    pattern: '/catalog/products/prices',
    handler: (ctx) => {
      const ids = Array.isArray(bodyOf(ctx).ids) ? (bodyOf(ctx).ids as string[]) : []
      return ok(
        ids
          .map((id) => ctx.data.products.find((p) => p.id === id))
          .filter((p): p is DemoProduct => Boolean(p))
          .map((p) => ({ id: p.id, effectivePrice: p.effectivePrice, onPromotion: p.onPromotion, available: p.active && p.status === 'AVAILABLE' })),
      )
    },
  },
  {
    method: 'POST',
    pattern: '/catalog/products/:id/shipping-preview',
    handler: (ctx) => ok(shippingQuote(ctx.data.products.find((p) => p.id === ctx.params.id)?.freeShipping ?? false)),
  },
  { method: 'POST', pattern: '/shipping/calculate', handler: () => ok(shippingQuote(false)) },
  { method: 'POST', pattern: '/admin/manual-orders/shipping-quote', handler: () => ok(shippingQuote(false)) },
  {
    method: 'GET',
    pattern: '/products/:id/reviews',
    handler: (ctx) => {
      const search = ctx.query.get('search')?.trim()
      const reviews = ctx.data.reviews.filter(
        (r) => r.productId === ctx.params.id && (!search || contains(r.comment, search) || contains(r.userName, search)),
      )
      const all = ctx.data.reviews.filter((r) => r.productId === ctx.params.id)
      const average = all.length === 0 ? null : Math.round((all.reduce((acc, r) => acc + r.rating, 0) / all.length) * 10) / 10
      return ok({ ...paginate(reviews, ctx.query), averageRating: average, totalReviews: all.length })
    },
  },
]
