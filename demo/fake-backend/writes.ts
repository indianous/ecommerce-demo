/**
 * Escritas: respondem sucesso e não mudam nada. Os casos especiais montam a resposta que a tela usa em seguida
 * (pedido criado, carrinho, cupom, configurações). O resto cai em `genericWrite`.
 */
import type { OrderItemResponse, OrderStatus } from '@/types'
import type { DemoData, DemoOrder } from '../generator/generate'
import { cartOf } from './queries/account'
import { adminOrderDetailOut, adminOrderOut, customerOrderOut, employeeOut, omit, productOut, userOut } from './present'
import { badRequest, bodyOf, created, noContent, notFound, ok, type Context, type DemoResponse, type Route } from './types'

const PLACEHOLDER_IMAGE = '/demo/images/site/placeholder.svg'
const round2 = (n: number) => Math.round(n * 100) / 100
const uuid = () => crypto.randomUUID()

/** Escritas sem corpo de resposta no backend (`void`). */
const VOID_WRITES: [string, RegExp][] = [
  ['POST', /^\/tracking\/page-views$/],
  ['POST', /^\/catalog\/products\/[^/]+\/views$/],
  ['POST', /^\/wishlist\/[^/]+$/],
  ['PATCH', /^\/notifications\/(read-all|[^/]+\/read)$/],
  ['PATCH', /^\/users\/me\/password$/],
  ['POST', /^\/users\/me\/mfa\/disable$/],
  ['POST', /^\/admin\/users\/[^/]+\/(password-invite|mfa\/reset)$/],
]

function newOrder(ctx: Context, userId: string, items: OrderItemResponse[], extra: Partial<DemoOrder>): DemoOrder {
  const { data } = ctx
  const customer = data.users.find((u) => u.id === userId)!
  const subtotal = round2(items.reduce((acc, i) => acc + i.subtotal, 0))
  const nowIso = new Date(ctx.now).toISOString()
  return {
    id: uuid(),
    userId,
    orderNumber: Math.max(1000, ...data.orders.map((o) => o.orderNumber)) + 1,
    customerName: customer.name,
    customerEmail: customer.email,
    status: 'PENDING',
    totalAmount: subtotal,
    discountAmount: 0,
    couponCode: null,
    paymentMethod: 'PIX',
    paymentStatus: 'PENDING',
    paymentProvider: 'STRIPE',
    createdAt: nowIso,
    itemCount: items.reduce((acc, i) => acc + i.quantity, 0),
    shippingCost: 0,
    origin: 'WEB',
    createdByName: null,
    notes: null,
    items,
    address: null,
    paymentCheckoutUrl: null,
    statusHistory: [{ id: uuid(), fromStatus: null, toStatus: 'PENDING', changedByEmail: null, reason: null, attachmentUrls: [], createdAt: nowIso }],
    deliveryMethod: 'DELIVERY',
    ...extra,
  }
}

const itemFrom = (data: DemoData, productId: string, quantity: number): OrderItemResponse | null => {
  const product = data.products.find((p) => p.id === productId)
  return product
    ? { productId, productName: product.name, quantity, unitPrice: product.effectivePrice, subtotal: round2(product.effectivePrice * quantity) }
    : null
}

const findOrder = (ctx: Context) => ctx.data.orders.find((o) => o.id === ctx.params.id)
const recoveryCodes = () => Array.from({ length: 10 }, () => crypto.randomUUID().replace(/-/g, '').slice(0, 10))

export const writeRoutes: Route[] = [
  // Carrinho: toda alteração devolve o carrinho como está
  ...(['POST /cart/items', 'PATCH /cart/items/:id', 'DELETE /cart/items/:id', 'POST /cart/merge'] as const).map((spec): Route => {
    const [method, pattern] = spec.split(' ') as [Route['method'], string]
    return { method, pattern, handler: (ctx) => ok(cartOf(ctx.user!, ctx.data)) }
  }),
  {
    method: 'POST',
    pattern: '/cart/coupon',
    handler: (ctx) => {
      const code = String(bodyOf(ctx).code ?? '').trim().toUpperCase()
      const coupon = ctx.data.coupons.find((c) => c.code === code && c.status === 'ACTIVE')
      if (!coupon) return badRequest('Cupom inválido ou expirado.')
      const subtotal = cartOf(ctx.user!, ctx.data).total
      if (coupon.minSubtotal !== null && subtotal < coupon.minSubtotal) {
        return badRequest(`Este cupom vale para compras a partir de R$ ${coupon.minSubtotal.toFixed(2).replace('.', ',')}.`)
      }
      const raw = coupon.type === 'PERCENT' ? (subtotal * coupon.value) / 100 : coupon.value
      const discountAmount = round2(Math.min(subtotal, coupon.maxDiscountAmount === null ? raw : Math.min(raw, coupon.maxDiscountAmount)))
      return ok({ code: coupon.code, discountAmount, subtotal })
    },
  },

  // Pedidos
  {
    method: 'POST',
    pattern: '/orders',
    handler: (ctx) => {
      const body = bodyOf(ctx)
      const cart = cartOf(ctx.user!, ctx.data).items
      const fallback = ctx.data.products.find((p) => p.active && p.status === 'AVAILABLE')
      const items = (cart.length > 0 ? cart.map((i) => itemFrom(ctx.data, i.productId, i.quantity)) : fallback ? [itemFrom(ctx.data, fallback.id, 1)] : [])
        .filter((i): i is OrderItemResponse => i !== null)
      const pickup = body.deliveryMethod === 'PICKUP'
      const order = newOrder(ctx, ctx.user!.id, items, {
        paymentMethod: (body.paymentMethod as DemoOrder['paymentMethod']) ?? 'PIX',
        deliveryMethod: pickup ? 'PICKUP' : 'DELIVERY',
        ...(pickup ? { pickupLocation: ctx.data.distributionCenters.find((c) => c.id === body.pickupLocationId) ?? ctx.data.distributionCenters[0] } : {}),
        checkoutUrl: '/orders',
        paymentCheckoutUrl: '/orders',
        paymentExpiresAt: new Date(ctx.now + 3 * 86_400_000).toISOString(),
      })
      return created(customerOrderOut(order))
    },
  },
  {
    method: 'POST',
    pattern: '/admin/manual-orders',
    handler: (ctx) => {
      const body = bodyOf(ctx)
      const customerId = ctx.data.users.some((u) => u.id === body.customerId) ? String(body.customerId) : ctx.data.users.find((u) => u.role === 'CUSTOMER')!.id
      const items = (Array.isArray(body.items) ? (body.items as { productId: string; quantity: number }[]) : [])
        .map((i) => itemFrom(ctx.data, i.productId, Number(i.quantity) || 1))
        .filter((i): i is OrderItemResponse => i !== null)
      const order = newOrder(ctx, customerId, items, {
        origin: 'STAFF',
        createdByName: ctx.user!.name,
        notes: typeof body.notes === 'string' ? body.notes : null,
        paymentMethod: (body.paymentMethod as DemoOrder['paymentMethod']) ?? 'PIX',
        paymentProvider: 'MANUAL',
        paymentStatus: body.paymentReceived === true ? 'PAID' : 'PENDING',
        deliveryMethod: body.deliveryMethod === 'PICKUP' ? 'PICKUP' : 'DELIVERY',
      })
      return created(adminOrderDetailOut(order))
    },
  },
  {
    method: 'PATCH',
    pattern: '/admin/orders/:id/status',
    handler: (ctx) => {
      const order = findOrder(ctx)
      if (!order) return notFound('Pedido não encontrado')
      const body = bodyOf(ctx)
      const status = (body.status as OrderStatus) ?? order.status
      const entry = {
        id: uuid(),
        fromStatus: order.status,
        toStatus: status,
        changedByEmail: ctx.user!.email,
        reason: typeof body.reason === 'string' ? body.reason : null,
        attachmentUrls: Array.isArray(body.attachmentUrls) ? (body.attachmentUrls as string[]) : [],
        createdAt: new Date(ctx.now).toISOString(),
      }
      return ok(adminOrderDetailOut({ ...order, status, statusHistory: [...order.statusHistory, entry] }))
    },
  },
  {
    method: 'PATCH',
    pattern: '/admin/orders/:id/payment-status',
    handler: (ctx) => {
      const order = findOrder(ctx)
      if (!order) return notFound('Pedido não encontrado')
      return ok(adminOrderOut({ ...order, paymentStatus: (bodyOf(ctx).paymentStatus as DemoOrder['paymentStatus']) ?? order.paymentStatus }))
    },
  },
  {
    method: 'POST',
    pattern: '/admin/orders/:id/change-requests',
    handler: (ctx) => {
      const order = findOrder(ctx)
      if (!order) return notFound('Pedido não encontrado')
      const body = bodyOf(ctx)
      return created({
        id: uuid(),
        orderId: order.id,
        orderNumber: order.orderNumber,
        requestedByEmail: ctx.user!.email,
        fromStatus: order.status,
        toStatus: body.toStatus ?? order.status,
        justification: body.justification ?? '',
        attachmentUrls: body.attachmentUrls ?? [],
        status: 'PENDING',
        resolvedByEmail: null,
        resolvedAt: null,
        createdAt: new Date(ctx.now).toISOString(),
      })
    },
  },
  ...(['approve', 'reject'] as const).map(
    (action): Route => ({
      method: 'PATCH',
      pattern: `/admin/orders/change-requests/:id/${action}`,
      handler: (ctx) => {
        const request = ctx.data.orderChangeRequests.find((r) => r.id === ctx.params.id)
        if (!request) return notFound('Solicitação não encontrada')
        return ok({
          ...request,
          status: action === 'approve' ? 'APPROVED' : 'REJECTED',
          resolvedByEmail: ctx.user!.email,
          resolvedAt: new Date(ctx.now).toISOString(),
        })
      },
    }),
  ),
  {
    method: 'POST',
    pattern: '/admin/orders/:id/shipping-label',
    handler: (ctx) => {
      const order = findOrder(ctx)
      return order ? ok({ trackingCode: order.trackingCode ?? 'AA000000000BR', shippingLabelUrl: null }) : notFound('Pedido não encontrado')
    },
  },
  {
    method: 'POST',
    pattern: '/admin/orders/:id/invoice',
    handler: (ctx) => {
      const order = findOrder(ctx)
      return order ? ok(order.invoice ?? { id: uuid(), orderId: order.id, status: 'PROCESSING' }) : notFound('Pedido não encontrado')
    },
  },

  // Produtos e estoque
  {
    method: 'PATCH',
    pattern: '/admin/products/:id/restore',
    handler: (ctx) => {
      const product = ctx.data.products.find((p) => p.id === ctx.params.id)
      return product ? ok({ ...productOut(product, ctx.data), active: true }) : notFound('Produto não encontrado')
    },
  },
  ...(['entries', 'exits'] as const).map(
    (kind): Route => ({
      method: 'POST',
      pattern: `/admin/products/:id/stock-movements/${kind}`,
      handler: (ctx) => {
        const product = ctx.data.products.find((p) => p.id === ctx.params.id)
        if (!product) return notFound('Produto não encontrado')
        const body = bodyOf(ctx)
        const quantity = Number(body.quantity) || 0
        const after = product.stockQuantity + (kind === 'entries' ? quantity : -quantity)
        return created({
          id: uuid(),
          productId: product.id,
          type: kind === 'entries' ? 'ENTRY' : 'EXIT',
          reason: body.reason ?? (kind === 'entries' ? 'PURCHASE' : 'OTHER'),
          quantity,
          quantityBefore: product.stockQuantity,
          quantityAfter: Math.max(0, after),
          note: body.note,
          lotId: body.lotId ?? uuid(),
          lotNumber: body.lotNumber,
          lotExpiryDate: body.expiryDate,
          actorEmail: ctx.user!.email,
          createdAt: new Date(ctx.now).toISOString(),
        })
      },
    }),
  ),
  {
    method: 'POST',
    pattern: '/admin/products/import',
    handler: () =>
      ok({ createdCount: 0, created: [], errors: [], warnings: [{ row: 0, message: 'Na demonstração, a importação não grava nenhum produto.' }] }),
  },
  {
    method: 'POST',
    pattern: '/products/:id/reviews',
    handler: (ctx) => {
      const body = bodyOf(ctx)
      const nowIso = new Date(ctx.now).toISOString()
      return created({
        id: uuid(),
        productId: ctx.params.id,
        userId: ctx.user!.id,
        userName: ctx.user!.name,
        rating: Number(body.rating) || 5,
        comment: body.comment,
        imageUrls: Array.isArray(body.imageUrls) ? body.imageUrls : [],
        createdAt: nowIso,
        updatedAt: nowIso,
      })
    },
  },

  // Uploads (o arquivo não é lido)
  { method: 'POST', pattern: '/upload/image', handler: () => ok({ url: PLACEHOLDER_IMAGE }) },
  { method: 'POST', pattern: '/upload/receipt', handler: () => ok({ url: PLACEHOLDER_IMAGE }) },
  {
    method: 'POST',
    pattern: '/site/banners',
    handler: (ctx) => created({ id: uuid(), imageUrl: PLACEHOLDER_IMAGE, linkUrl: null, position: ctx.data.banners.length }),
  },

  // Site
  {
    method: 'PUT',
    pattern: '/site/settings/:section',
    // Seções em JSON voltam com o corpo aplicado; as de imagem (multipart) voltam como estão.
    handler: (ctx) => ok({ ...ctx.data.settings, ...bodyOf(ctx) }),
  },
  {
    method: 'PUT',
    pattern: '/site/payment-gateway',
    handler: (ctx) => {
      const active = bodyOf(ctx).active
      return ok({ ...ctx.data.paymentGateway, ...(typeof active === 'string' ? { active } : {}) })
    },
  },
  { method: 'PATCH', pattern: '/admin/site/nav-items/order', handler: (ctx) => ok(ctx.data.navItems) },
  { method: 'PATCH', pattern: '/admin/site/nav-items/:id/children-order', handler: (ctx) => ok(ctx.data.navItems) },

  // Pessoas e conta
  {
    method: 'PUT',
    pattern: '/admin/employees/:id/permissions',
    handler: (ctx) => ok({ permissions: Array.isArray(bodyOf(ctx).permissions) ? bodyOf(ctx).permissions : [] }),
  },
  ...(['/admin/employees', '/admin/admins'] as const).map(
    (pattern): Route => ({
      method: 'POST',
      pattern,
      handler: (ctx) => {
        const body = bodyOf(ctx)
        return created({
          ...employeeOut({ ...ctx.user!, id: uuid(), name: String(body.name ?? ''), email: String(body.email ?? ''), permissions: [], primaryAdmin: false }),
          role: pattern === '/admin/admins' ? 'ADMIN' : 'EMPLOYEE',
          passwordSet: Boolean(body.password),
          emailVerified: false,
          mfaEnabled: false,
        })
      },
    }),
  ),
  { method: 'PATCH', pattern: '/users/me', handler: (ctx) => ok({ ...userOut(ctx.user!), ...omit(bodyOf(ctx), 'role', 'id', 'email', 'permissions') }) },
  {
    method: 'POST',
    pattern: '/users/me/mfa/setup/start',
    handler: (ctx) => ok({ secret: 'JBSWY3DPEHPK3PXP', otpauthUri: `otpauth://totp/Vitrine%20Demo:${encodeURIComponent(ctx.user!.email)}?secret=JBSWY3DPEHPK3PXP&issuer=Vitrine%20Demo` }),
  },
  { method: 'POST', pattern: '/users/me/mfa/setup/confirm', handler: () => ok({ recoveryCodes: recoveryCodes() }) },
  { method: 'POST', pattern: '/users/me/mfa/recovery-codes', handler: () => ok({ recoveryCodes: recoveryCodes() }) },
]

/** Índice id → registro, para as edições genéricas devolverem o registro mesclado com o corpo. */
const indexCache = new WeakMap<DemoData, Map<string, Record<string, unknown>>>()
function entityIndex(data: DemoData) {
  let index = indexCache.get(data)
  if (index) return index
  index = new Map()
  const add = (list: object[], present: (item: never) => object = (item) => item) => {
    for (const item of list) index!.set((item as { id: string }).id, present(item as never) as Record<string, unknown>)
  }
  add(data.products, (p) => productOut(p, data))
  add(data.categories)
  add(data.users.filter((u) => u.role !== 'CUSTOMER'), employeeOut)
  add(data.addresses, (a) => omit(a as { userId: string }, 'userId'))
  add(data.distributionCenters)
  add(data.promotions, (p) => omit(p as { productIds: string[] }, 'productIds'))
  add(data.coupons)
  add(data.orders, adminOrderDetailOut)
  add(data.banners)
  add(data.navItems.flatMap((n) => [n, ...(n.children ?? [])]))
  add(data.reviews)
  indexCache.set(data, index)
  return index
}

/** Qualquer outra escrita: sucesso sem efeito. */
export function genericWrite(ctx: Context): DemoResponse {
  const { method, path } = ctx.req
  if (method === 'DELETE' || VOID_WRITES.some(([m, re]) => m === method && re.test(path))) return noContent()

  const body = bodyOf(ctx)
  if (method === 'POST' && path.endsWith('/bulk-delete')) {
    const ids = Array.isArray(body.ids) ? body.ids : []
    return ok({ successCount: ids.length, failures: [] })
  }

  const index = entityIndex(ctx.data)
  const existing = path.split('/').reverse().map((segment) => index.get(segment)).find(Boolean)
  if (existing && (method === 'PUT' || method === 'PATCH' || method === 'POST')) return ok({ ...existing, ...body })
  if (method === 'POST') return created({ ...body, id: uuid(), createdAt: new Date(ctx.now).toISOString() })
  return ok(body)
}
