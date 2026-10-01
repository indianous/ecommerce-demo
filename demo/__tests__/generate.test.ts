import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { OrderStatus, PaymentStatus } from '@/types'
import { generate, validateConfig, FIXED_ACCOUNTS, type DemoData } from '../generator/generate'

const NOW = new Date('2026-10-01T12:00:00Z')
const exampleConfig = validateConfig(JSON.parse(readFileSync(path.join(__dirname, '../data.config.json'), 'utf8')))
const { data, images } = generate(exampleConfig, { now: NOW })

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((item) => [item.id, item]))

function cpfIsValid(cpf: string) {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false
  const check = (length: number) => {
    const sum = [...digits.slice(0, length)].reduce((acc, d, i) => acc + Number(d) * (length + 1 - i), 0)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  return check(9) === Number(digits[9]) && check(10) === Number(digits[10])
}

describe('generate — quantidades', () => {
  const c = exampleConfig

  it.each([
    ['categories', () => data.categories.length, c.categories],
    ['products', () => data.products.length, c.products],
    ['orders', () => data.orders.length, c.orders],
    ['orderChangeRequests', () => data.orderChangeRequests.length, c.orderChangeRequests],
    ['reviews', () => data.reviews.length, c.reviews],
    ['wishlistItems', () => data.wishlist.length, c.wishlistItems],
    ['cartItems', () => data.carts.length, c.cartItems],
    ['coupons', () => data.coupons.length, c.coupons],
    ['couponRedemptions', () => data.couponRedemptions.length, c.couponRedemptions],
    ['promotions', () => data.promotions.length, c.promotions],
    ['stockMovements', () => data.stockMovements.length, c.stockMovements],
    ['distributionCenters', () => data.distributionCenters.length, c.distributionCenters],
    ['banners', () => data.banners.length, c.banners],
    ['notifications', () => data.notifications.length, c.notifications],
    ['auditLogs', () => data.auditLogs.length, c.auditLogs],
    ['pageViews', () => data.pageViews.length, c.pageViews],
  ])('%s', (_, count, expected) => {
    expect(count()).toBe(expected)
  })

  it('navItems conta os itens de todos os níveis do menu', () => {
    const total = data.navItems.reduce((acc, item) => acc + 1 + (item.children?.length ?? 0), 0)
    expect(total).toBe(c.navItems)
  })

  it('usuários: as quantidades da configuração mais as três contas fixas', () => {
    const count = (role: string) => data.users.filter((u) => u.role === role).length
    expect(count('CUSTOMER')).toBe(c.customers + 1)
    expect(count('EMPLOYEE')).toBe(c.employees + 1)
    expect(count('ADMIN')).toBe(c.admins + 1)
  })

  it('endereços: addressesPerCustomer por cliente (o cliente fixo sempre tem ao menos um)', () => {
    expect(data.addresses).toHaveLength(c.customers * c.addressesPerCustomer + Math.max(1, c.addressesPerCustomer))
  })

  it('gera tudo vazio com quantidades zeradas, exceto as contas fixas e as configurações do site', () => {
    const zero = validateConfig(Object.fromEntries(Object.keys(exampleConfig).filter((k) => k !== 'seed' && k !== 'periodDays').map((k) => [k, 0])))
    const empty = generate(zero, { now: NOW }).data
    expect(empty.users).toHaveLength(3)
    expect(empty.products).toHaveLength(0)
    expect(empty.orders).toHaveLength(0)
    expect(empty.addresses).toHaveLength(1)
    expect(empty.settings.siteTitle).toBeTruthy()
  })
})

describe('generate — contas fixas', () => {
  it.each(Object.values(FIXED_ACCOUNTS))('$email existe com o perfil $role', ({ email, role }) => {
    const user = data.users.find((u) => u.email === email)
    expect(user?.role).toBe(role)
    expect(user?.emailVerified).toBe(true)
    expect(user?.passwordSet).toBe(true)
  })

  it('o funcionário fixo tem todas as permissões e o admin fixo é o principal', () => {
    const employee = data.users.find((u) => u.email === FIXED_ACCOUNTS.employee.email)!
    expect(employee.permissions).toHaveLength(13)
    expect(data.users.find((u) => u.email === FIXED_ACCOUNTS.admin.email)!.primaryAdmin).toBe(true)
  })

  it('o cliente fixo tem pedidos, endereço, lista de desejos, carrinho e notificações', () => {
    const customer = data.users.find((u) => u.email === FIXED_ACCOUNTS.customer.email)!
    expect(data.orders.filter((o) => o.userId === customer.id).length).toBeGreaterThanOrEqual(5)
    expect(data.addresses.some((a) => a.userId === customer.id)).toBe(true)
    expect(data.wishlist.some((w) => w.userId === customer.id)).toBe(true)
    expect(data.carts.some((item) => item.userId === customer.id)).toBe(true)
    expect(data.notifications.some((n) => n.userId === customer.id && n.readAt === null)).toBe(true)
  })
})

describe('generate — reprodutível', () => {
  it('mesma seed gera os mesmos dados e as mesmas imagens', () => {
    const again = generate(exampleConfig, { now: NOW })
    expect(again.data).toEqual(data)
    expect(again.images).toEqual(images)
  })

  it('seed diferente gera dados diferentes', () => {
    const other = generate({ ...exampleConfig, seed: exampleConfig.seed + 1 }, { now: NOW }).data
    expect(other.products.map((p) => p.name)).not.toEqual(data.products.map((p) => p.name))
  })

  it('guarda o momento da geração', () => {
    expect(data.generatedAt).toBe(NOW.toISOString())
  })
})

describe('generate — integridade', () => {
  const users = byId(data.users)
  const products = byId(data.products)
  const orders = byId(data.orders)
  const staffEmails = new Set(data.users.filter((u) => u.role !== 'CUSTOMER').map((u) => u.email))

  it('todo pedido é de um cliente que existe e só tem produtos que existem', () => {
    for (const order of data.orders) {
      expect(users.get(order.userId)?.role).toBe('CUSTOMER')
      for (const item of order.items) expect(products.has(item.productId)).toBe(true)
    }
  })

  it('o total do pedido fecha: itens − desconto + frete', () => {
    for (const order of data.orders) {
      const subtotal = order.items.reduce((acc, item) => acc + item.subtotal, 0)
      for (const item of order.items) expect(item.subtotal).toBeCloseTo(item.unitPrice * item.quantity, 2)
      expect(order.totalAmount).toBeCloseTo(subtotal - (order.discountAmount ?? 0) + (order.shippingCost ?? 0), 2)
      expect(order.itemCount).toBe(order.items.reduce((acc, item) => acc + item.quantity, 0))
    }
  })

  it('o produto já existia quando foi vendido', () => {
    for (const order of data.orders) {
      for (const item of order.items) expect(products.get(item.productId)!.createdAt <= order.createdAt).toBe(true)
    }
  })

  it('o histórico de status começa no pedido e termina no status atual', () => {
    for (const order of data.orders) {
      expect(order.statusHistory[0].fromStatus).toBeNull()
      expect(order.statusHistory.at(-1)!.toStatus).toBe(order.status)
      expect(order.statusHistory[0].createdAt).toBe(order.createdAt)
    }
  })

  it('pedido de entrega tem endereço do próprio cliente; retirada tem centro de distribuição', () => {
    const addresses = byId(data.addresses)
    const centers = byId(data.distributionCenters)
    for (const order of data.orders) {
      if (order.deliveryMethod === 'PICKUP') {
        expect(centers.has(order.pickupLocation!.id)).toBe(true)
      } else if (order.address) {
        expect(addresses.get(order.address.id)?.userId).toBe(order.userId)
      }
    }
  })

  it('toda avaliação é de um cliente que recebeu o produto, uma por cliente e produto', () => {
    const received = new Set(
      data.orders.filter((o) => o.status === 'DELIVERED').flatMap((o) => o.items.map((i) => `${o.userId}:${i.productId}`)),
    )
    const pairs = data.reviews.map((r) => `${r.userId}:${r.productId}`)
    for (const pair of pairs) expect(received.has(pair)).toBe(true)
    expect(new Set(pairs).size).toBe(pairs.length)
  })

  it('média e quantidade de avaliações do produto batem com as avaliações', () => {
    for (const product of data.products) {
      const reviews = data.reviews.filter((r) => r.productId === product.id)
      expect(product.reviewCount).toBe(reviews.length)
      if (reviews.length > 0) {
        expect(product.averageRating).toBeCloseTo(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length, 1)
      }
    }
  })

  it('o saldo de estoque bate com as movimentações, sem ficar negativo', () => {
    for (const product of data.products) {
      const movements = data.stockMovements.filter((m) => m.productId === product.id)
      expect(movements.length).toBeGreaterThanOrEqual(1)
      let balance = 0
      for (const m of movements) {
        expect(m.quantityBefore).toBe(balance)
        balance += m.type === 'ENTRY' ? m.quantity : -m.quantity
        expect(m.quantityAfter).toBe(balance)
        expect(balance).toBeGreaterThanOrEqual(0)
      }
      expect(product.stockQuantity).toBe(balance)
    }
  })

  it('lotes: o saldo dos lotes do produto soma o estoque', () => {
    for (const product of data.products) {
      const lots = data.stockLots.filter((l) => l.productId === product.id)
      expect(lots.reduce((acc, l) => acc + l.quantity, 0)).toBe(product.stockQuantity)
    }
  })

  it('auditoria, movimentações e solicitações apontam para alguém da equipe', () => {
    for (const log of data.auditLogs) expect(staffEmails.has(log.actorEmail!)).toBe(true)
    for (const m of data.stockMovements) expect(staffEmails.has(m.actorEmail!)).toBe(true)
    for (const r of data.orderChangeRequests) {
      expect(staffEmails.has(r.requestedByEmail)).toBe(true)
      expect(orders.get(r.orderId)?.orderNumber).toBe(r.orderNumber)
    }
  })

  it('usos de cupom apontam para pedidos com o código e o desconto do cupom', () => {
    const coupons = byId(data.coupons)
    for (const redemption of data.couponRedemptions) {
      const order = orders.get(redemption.orderId)!
      expect(order.couponCode).toBe(coupons.get(redemption.couponId)!.code)
      expect(order.discountAmount).toBe(redemption.discountAmount)
    }
  })

  it('promoção ativa aparece no produto com preço promocional menor', () => {
    for (const promotion of data.promotions.filter((p) => p.status === 'ACTIVE')) {
      for (const id of promotion.productIds) {
        const product = products.get(id)!
        expect(product.onPromotion).toBe(true)
        expect(product.promotionId).toBe(promotion.id)
        expect(product.effectivePrice).toBeLessThan(product.price)
      }
    }
  })

  it('lista de desejos e carrinho sem pares repetidos', () => {
    for (const list of [data.wishlist, data.carts]) {
      const pairs = list.map((item) => `${item.userId}:${item.productId}`)
      expect(new Set(pairs).size).toBe(pairs.length)
    }
  })

  it('notificações são de clientes e apontam para a página de pedidos', () => {
    for (const n of data.notifications) {
      expect(users.get(n.userId)?.role).toBe('CUSTOMER')
      expect(n.linkUrl).toBe('/orders')
    }
  })

  it('nenhuma data passa do momento da geração', () => {
    const dates = JSON.stringify(data).match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g) ?? []
    const future = new Set([
      ...data.promotions.filter((p) => p.status === 'SCHEDULED').flatMap((p) => [p.startDate, p.endDate]),
      ...data.promotions.filter((p) => p.status === 'ACTIVE').map((p) => p.endDate),
      ...data.coupons.flatMap((c) => [c.startsAt, c.endsAt]),
      ...data.stockLots.map((l) => l.expiryDate),
      ...data.stockMovements.map((m) => m.lotExpiryDate),
      ...data.orders.map((o) => o.paymentExpiresAt),
      ...data.products.flatMap((p) => [p.promotionStartDate, p.promotionEndDate]),
    ])
    for (const date of dates) {
      if (!future.has(date)) expect({ date, future: date > NOW.toISOString() }).toEqual({ date, future: false })
    }
  })
})

describe('generate — variedade', () => {
  it('toda categoria tem produto', () => {
    for (const category of data.categories) {
      expect(data.products.some((p) => p.categories.some((c) => c.id === category.id))).toBe(true)
    }
  })

  it.each<OrderStatus>(['PENDING', 'CONFIRMED', 'SHIPPED', 'RETURNED', 'DELIVERED', 'CANCELLED'])('há pedido %s', (status) => {
    expect(data.orders.some((o) => o.status === status)).toBe(true)
  })

  it.each<PaymentStatus>(['PENDING', 'PAID', 'FAILED', 'REFUNDED'])('há pagamento %s', (status) => {
    expect(data.orders.some((o) => o.paymentStatus === status)).toBe(true)
  })

  it('há pedido de retirada e pedido registrado pela equipe', () => {
    expect(data.orders.some((o) => o.deliveryMethod === 'PICKUP')).toBe(true)
    expect(data.orders.some((o) => o.origin === 'STAFF')).toBe(true)
  })

  it('há produto vendido nos últimos 30 dias (vitrine "mais vendidos")', () => {
    expect(data.products.some((p) => (p.soldQuantityLast30Days ?? 0) > 0)).toBe(true)
  })
})

describe('generate — dados únicos e fictícios', () => {
  it('slugs, e-mails e números de pedido únicos', () => {
    for (const values of [data.products.map((p) => p.slug), data.users.map((u) => u.email), data.orders.map((o) => String(o.orderNumber))]) {
      expect(new Set(values).size).toBe(values.length)
    }
  })

  it('todo e-mail é @demo.com ou @example.com', () => {
    const emails = JSON.stringify(data).match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? []
    for (const email of emails) expect(email).toMatch(/@(demo\.com|example\.com)$/)
  })

  it('todo CPF tem dígito verificador válido', () => {
    for (const user of data.users.filter((u) => u.cpf)) expect(cpfIsValid(user.cpf!)).toBe(true)
  })
})

describe('generate — imagens', () => {
  const referenced = [...new Set(JSON.stringify(data).match(/\/demo\/images\/[\w/.-]+/g) ?? [])]

  it('toda imagem citada nos dados foi gerada', () => {
    expect(referenced.length).toBeGreaterThan(0)
    for (const url of referenced) expect(images[url.replace('/demo/images/', '')]).toBeDefined()
  })

  it('toda imagem é um SVG com viewBox', () => {
    for (const svg of Object.values(images)) expect(svg).toMatch(/^<svg [^>]*viewBox="[^"]+"/)
  })

  it('a imagem do produto usa a cor do nome do produto', () => {
    for (const product of data.products) {
      const svg = images[product.imageUrls[0].replace('/demo/images/', '')]
      expect(svg).toContain(product.colorHex)
    }
  })

  it('logo, favicon e placeholder do site são imagens geradas', () => {
    for (const url of [data.settings.logoUrl, data.settings.faviconUrl, data.settings.placeholderImageUrl]) {
      expect(url).toMatch(/^\/demo\/images\/site\//)
    }
  })
})

// Garante que o tipo exportado continua sendo o que o backend falso consome.
const _typeCheck: DemoData = data
void _typeCheck
