import type { DemoUser } from '../../generator/generate'
import { contains, multi, paginate } from '../paging'
import { addressOut, employeeOut } from '../present'
import { notFound, ok, type Context, type Route } from '../types'

const isStaff = (u: DemoUser) => u.role === 'EMPLOYEE' || u.role === 'ADMIN'
const matches = (u: DemoUser, search: string | undefined) =>
  !search || contains(u.name, search) || contains(u.email, search) || contains(u.cpf?.replace(/\D/g, ''), search.replace(/\D/g, '') || '\u0000')
const byName = (a: DemoUser, b: DemoUser) => a.name.localeCompare(b.name, 'pt-BR')
const staffById = (ctx: Context) => ctx.data.users.find((u) => u.id === ctx.params.id && isStaff(u))

function customerDetail(customer: DemoUser, ctx: Context) {
  const { data } = ctx
  const orders = data.orders.filter((o) => o.userId === customer.id)
  const paid = orders.filter((o) => o.paymentStatus === 'PAID')
  const cart = data.carts
    .filter((c) => c.userId === customer.id)
    .map((c) => {
      const product = data.products.find((p) => p.id === c.productId)!
      return {
        productId: product.id,
        productName: product.name,
        quantity: c.quantity,
        unitPrice: product.effectivePrice,
        subtotal: Math.round(product.effectivePrice * c.quantity * 100) / 100,
      }
    })
  const views = data.pageViews.filter((v) => v.userId === customer.id)
  const seen = new Set<string>()
  const recentlyViewedProducts = views
    .filter((v) => v.productId && !seen.has(v.productId) && seen.add(v.productId))
    .slice(0, 5)
    .map((v) => {
      const product = data.products.find((p) => p.id === v.productId)!
      return { productId: product.id, productName: product.name, productSlug: product.slug, viewedAt: v.viewedAt }
    })

  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    createdAt: customer.createdAt,
    phone: customer.phone,
    birthDate: customer.birthDate,
    gender: customer.gender,
    purchaseSummary: {
      totalOrders: orders.length,
      totalSpent: Math.round(paid.reduce((acc, o) => acc + o.totalAmount, 0) * 100) / 100,
      lastPurchaseAt: orders[0]?.createdAt ?? null,
    },
    recentOrders: orders.slice(0, 5).map((o) => ({ id: o.id, orderNumber: o.orderNumber, status: o.status, totalAmount: o.totalAmount, createdAt: o.createdAt })),
    reviews: data.reviews
      .filter((r) => r.userId === customer.id)
      .map((r) => ({
        id: r.id,
        productId: r.productId,
        productName: data.products.find((p) => p.id === r.productId)!.name,
        rating: r.rating,
        comment: r.comment ?? '',
        createdAt: r.createdAt,
      })),
    wishlist: data.wishlist
      .filter((w) => w.userId === customer.id)
      .map((w) => {
        const product = data.products.find((p) => p.id === w.productId)!
        return { productId: product.id, productName: product.name, imageUrl: product.imageUrls[0] ?? null, price: product.effectivePrice, addedAt: w.addedAt }
      }),
    currentCart: cart,
    cartTotal: Math.round(cart.reduce((acc, i) => acc + i.subtotal, 0) * 100) / 100,
    addresses: data.addresses.filter((a) => a.userId === customer.id).map(addressOut),
    trafficSource: customer.trafficSource,
    recentPageViews: views.slice(0, 10).map((v) => ({ path: v.path, viewedAt: v.viewedAt })),
    recentlyViewedProducts,
    passwordSet: customer.passwordSet,
    emailVerified: customer.emailVerified,
    mfaEnabled: customer.mfaEnabled,
  }
}

export const adminPeopleRoutes: Route[] = [
  {
    method: 'GET',
    pattern: '/admin/customers',
    handler: (ctx) => {
      const search = ctx.query.get('search')?.trim()
      const list = ctx.data.users
        .filter((u) => u.role === 'CUSTOMER' && matches(u, search))
        .map((u) => ({ id: u.id, name: u.name, email: u.email }))
      return ok(paginate(list, ctx.query))
    },
  },
  {
    method: 'GET',
    pattern: '/admin/customers/:id',
    handler: (ctx) => {
      const customer = ctx.data.users.find((u) => u.id === ctx.params.id && u.role === 'CUSTOMER')
      return customer ? ok(customerDetail(customer, ctx)) : notFound('Cliente não encontrado')
    },
  },
  {
    method: 'GET',
    pattern: '/admin/employees',
    handler: (ctx) => {
      const search = ctx.query.get('search')?.trim()
      const role = ctx.query.get('role')
      const permissions = multi(ctx.query, 'permission')
      const list = ctx.data.users
        .filter((u) => isStaff(u) && matches(u, search) && (!role || u.role === role))
        .filter((u) => permissions.length === 0 || permissions.some((p) => u.permissions.includes(p as never)))
        .sort(byName)
        .map(employeeOut)
      return ok(paginate(list, ctx.query))
    },
  },
  {
    method: 'GET',
    pattern: '/admin/employees/:id',
    handler: (ctx) => {
      const user = staffById(ctx)
      return user ? ok({ ...employeeOut(user), createdAt: user.createdAt }) : notFound('Funcionário não encontrado')
    },
  },
  {
    method: 'GET',
    pattern: '/admin/employees/:id/permissions',
    handler: (ctx) => {
      const user = staffById(ctx)
      return user ? ok({ permissions: user.permissions }) : notFound('Funcionário não encontrado')
    },
  },
  {
    method: 'GET',
    pattern: '/admin/employees/:id/audit-logs',
    handler: (ctx) => {
      const user = staffById(ctx)
      return user ? ok(paginate(ctx.data.auditLogs.filter((l) => l.actorEmail === user.email), ctx.query)) : notFound('Funcionário não encontrado')
    },
  },
  {
    method: 'GET',
    pattern: '/admin/admins',
    handler: (ctx) => {
      const search = ctx.query.get('search')?.trim()
      return ok(paginate(ctx.data.users.filter((u) => u.role === 'ADMIN' && matches(u, search)).sort(byName).map(employeeOut), ctx.query))
    },
  },
  {
    method: 'GET',
    pattern: '/admin/audit-logs',
    handler: (ctx) => {
      const types = multi(ctx.query, 'entityType')
      const actions = multi(ctx.query, 'action')
      const search = ctx.query.get('search')?.trim()
      const list = ctx.data.auditLogs.filter(
        (l) =>
          (types.length === 0 || types.includes(l.entityType)) &&
          (actions.length === 0 || actions.includes(l.action)) &&
          (!search || contains(l.actorEmail, search) || contains(l.entityId, search)),
      )
      return ok(paginate(list, ctx.query))
    },
  },
  {
    method: 'GET',
    pattern: '/admin/manual-orders/customers',
    handler: (ctx) => {
      const search = ctx.query.get('search')?.trim()
      return ok(
        ctx.data.users
          .filter((u) => u.role === 'CUSTOMER' && matches(u, search))
          .sort(byName)
          .slice(0, 10)
          .map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, cpf: u.cpf })),
      )
    },
  },
  {
    method: 'GET',
    pattern: '/admin/manual-orders/customers/:id/addresses',
    handler: (ctx) => ok(ctx.data.addresses.filter((a) => a.userId === ctx.params.id).map(addressOut)),
  },
]
