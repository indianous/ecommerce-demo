import type { DemoProduct } from '../../generator/generate'
import { bool, contains, multi, paginate } from '../paging'
import { omit, productOut } from '../present'
import { notFound, ok, type Context, type Route } from '../types'

const DAY = 86_400_000
const newestFirst = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt)
const findProduct = (ctx: Context) => ctx.data.products.find((p) => p.id === ctx.params.id)

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const adminCatalogRoutes: Route[] = [
  {
    method: 'GET',
    pattern: '/admin/products',
    handler: (ctx) => {
      const { query } = ctx
      let list: DemoProduct[] = ctx.data.products
      const search = query.get('search')?.trim()
      if (search) {
        list = list.filter((p) => [p.name, p.id, p.gtinEan, p.ncm, p.cfop].some((field) => contains(field, search)))
      }
      const categoryIds = multi(query, 'categoryId')
      if (categoryIds.length) list = list.filter((p) => p.categories.some((c) => categoryIds.includes(c.id)))
      const active = bool(query, 'active')
      if (active !== null) list = list.filter((p) => p.active === active)
      const statuses = multi(query, 'status')
      if (statuses.length) list = list.filter((p) => statuses.includes(p.status))
      const promotions = multi(query, 'promotion')
      if (promotions.length) {
        list = list.filter(
          (p) =>
            (promotions.includes('ACTIVE') && p.onPromotion) ||
            (promotions.includes('SCHEDULED') && Boolean(p.promotionId) && !p.onPromotion) ||
            (promotions.includes('NONE') && !p.promotionId),
        )
      }
      return ok(paginate([...list].sort(newestFirst).map((p) => productOut(p, ctx.data)), query))
    },
  },
  {
    method: 'GET',
    pattern: '/admin/products/export',
    handler: (ctx) => {
      const header = ['id', 'nome', 'slug', 'categoria', 'preco', 'preco_promocional', 'estoque', 'status', 'ativo', 'gtin_ean', 'ncm', 'cfop']
      const rows = ctx.data.products.map((p) =>
        [p.id, p.name, p.slug, p.categories[0]?.name, p.price, p.promotionalPrice, p.stockQuantity, p.status, p.active, p.gtinEan, p.ncm, p.cfop]
          .map(csvCell)
          .join(','),
      )
      return {
        status: 200,
        text: `${[header.join(','), ...rows].join('\n')}\n`,
        headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="produtos.csv"' },
      }
    },
  },
  {
    method: 'GET',
    pattern: '/admin/products/:id',
    handler: (ctx) => {
      const product = findProduct(ctx)
      return product ? ok(productOut(product, ctx.data)) : notFound('Produto não encontrado')
    },
  },
  {
    method: 'GET',
    pattern: '/admin/products/:id/stock-movements',
    handler: (ctx) => {
      const { query } = ctx
      let list = ctx.data.stockMovements.filter((m) => m.productId === ctx.params.id)
      const reasons = multi(query, 'reason')
      if (reasons.length) list = list.filter((m) => reasons.includes(m.reason))
      const from = query.get('from')
      if (from) list = list.filter((m) => m.createdAt >= `${from}T00:00:00`)
      const to = query.get('to')
      if (to) list = list.filter((m) => m.createdAt <= `${to}T23:59:59.999Z`)
      const search = query.get('search')?.trim()
      if (search) list = list.filter((m) => [m.note, m.orderId, m.lotNumber, m.actorEmail].some((f) => contains(f, search)))
      return ok(paginate([...list].sort(newestFirst), query))
    },
  },
  {
    method: 'GET',
    pattern: '/admin/products/:id/stock-lots',
    handler: (ctx) => ok(paginate(ctx.data.stockLots.filter((l) => l.productId === ctx.params.id).sort(newestFirst), ctx.query)),
  },
  {
    method: 'GET',
    pattern: '/admin/stock-lots/expiring',
    handler: (ctx) => {
      const days = Number.parseInt(ctx.query.get('days') ?? '30', 10) || 30
      const today = new Date(ctx.now).toISOString().slice(0, 10)
      const until = new Date(ctx.now + days * DAY).toISOString().slice(0, 10)
      const search = ctx.query.get('search')?.trim()
      const list = ctx.data.stockLots
        .filter((l) => l.quantity > 0 && l.expiryDate && l.expiryDate >= today && l.expiryDate <= until)
        .filter((l) => !search || contains(l.productName, search) || contains(l.lotNumber, search))
        .sort((a, b) => a.expiryDate!.localeCompare(b.expiryDate!))
      return ok(paginate(list, ctx.query))
    },
  },
  {
    method: 'GET',
    pattern: '/admin/categories',
    handler: (ctx) =>
      ok(
        [...ctx.data.categories]
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
          .map((c) => ({ ...c, productCount: ctx.data.products.filter((p) => p.categories.some((pc) => pc.id === c.id)).length })),
      ),
  },
  {
    method: 'GET',
    pattern: '/admin/coupons',
    handler: (ctx) => {
      const search = ctx.query.get('search')?.trim()
      const active = bool(ctx.query, 'active')
      const list = ctx.data.coupons.filter((c) => (!search || contains(c.code, search)) && (active === null || c.active === active))
      return ok(paginate(list, ctx.query))
    },
  },
  {
    method: 'GET',
    pattern: '/admin/coupons/:id/redemptions',
    handler: (ctx) =>
      ok(
        paginate(
          ctx.data.couponRedemptions
            .filter((r) => r.couponId === ctx.params.id)
            .sort((a, b) => b.redeemedAt.localeCompare(a.redeemedAt))
            .map((r) => omit(r, 'couponId')),
          ctx.query,
        ),
      ),
  },
  {
    method: 'GET',
    pattern: '/admin/promotions',
    handler: (ctx) => {
      const status = ctx.query.get('status')
      const search = ctx.query.get('search')?.trim()
      const list = ctx.data.promotions
        .filter((p) => (!status || p.status === status) && (!search || contains(p.name, search)))
        .sort((a, b) => b.startDate.localeCompare(a.startDate))
        .map((p) => omit(p, 'productIds'))
      return ok(paginate(list, ctx.query))
    },
  },
  {
    method: 'GET',
    pattern: '/admin/promotions/:id',
    handler: (ctx) => {
      const promotion = ctx.data.promotions.find((p) => p.id === ctx.params.id)
      if (!promotion) return notFound('Promoção não encontrada')
      const products = promotion.productIds.map((id) => {
        const p = ctx.data.products.find((product) => product.id === id)!
        return {
          productId: p.id,
          name: p.name,
          slug: p.slug,
          imageUrl: p.imageUrls[0] ?? null,
          price: p.price,
          promotionalPrice: Math.max(1, Math.floor(p.price * (1 - promotion.value / 100)) + 0.9),
          active: p.active,
        }
      })
      return ok({ ...omit(promotion, 'productIds', 'productCount'), products })
    },
  },
]
