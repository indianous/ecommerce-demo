import { contains, multi, paginate } from '../paging'
import { adminOrderDetailOut, adminOrderOut } from '../present'
import { notFound, ok, type Route } from '../types'

export const adminOrderRoutes: Route[] = [
  {
    method: 'GET',
    pattern: '/admin/orders',
    handler: (ctx) => {
      const { query } = ctx
      let list = ctx.data.orders
      const search = query.get('search')?.trim().replace(/^#/, '')
      if (search) {
        list = list.filter(
          (o) => String(o.orderNumber) === search || contains(o.customerName, search) || contains(o.customerEmail, search) || o.id === search,
        )
      }
      const statuses = multi(query, 'status')
      if (statuses.length) list = list.filter((o) => statuses.includes(o.status))
      const paymentStatus = query.get('paymentStatus')
      if (paymentStatus) list = list.filter((o) => o.paymentStatus === paymentStatus)
      const origin = query.get('origin')
      if (origin) list = list.filter((o) => (o.origin ?? 'WEB') === origin)
      return ok(paginate(list.map(adminOrderOut), query))
    },
  },
  {
    method: 'GET',
    pattern: '/admin/orders/change-requests',
    handler: (ctx) => {
      const statuses = multi(ctx.query, 'status')
      const search = ctx.query.get('search')?.trim().replace(/^#/, '')
      const list = ctx.data.orderChangeRequests.filter(
        (r) =>
          (statuses.length === 0 || statuses.includes(r.status)) &&
          (!search || String(r.orderNumber) === search || contains(r.requestedByEmail, search)),
      )
      return ok(paginate(list, ctx.query))
    },
  },
  {
    method: 'GET',
    pattern: '/admin/orders/:id',
    handler: (ctx) => {
      const order = ctx.data.orders.find((o) => o.id === ctx.params.id)
      return order ? ok(adminOrderDetailOut(order)) : notFound('Pedido não encontrado')
    },
  },
  {
    method: 'GET',
    pattern: '/admin/orders/:id/invoice',
    handler: (ctx) => {
      const invoice = ctx.data.orders.find((o) => o.id === ctx.params.id)?.invoice
      return invoice ? ok(invoice) : notFound('Nenhuma nota fiscal emitida para este pedido')
    },
  },
]
