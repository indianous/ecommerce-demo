import { asAdmin, asCustomer, asEmployee, body, call, data, fixedCustomer, fixedEmployee, GENERATED_AT } from './fake-backend-helpers'

const visible = data.products.filter((p) => p.active)

describe('catálogo', () => {
  it('GET /catalog/products pagina só produtos ativos, com os campos de página do Spring', () => {
    const page = body(call('GET', '/catalog/products?page=1&size=5'))
    expect(page).toMatchObject({ page: 1, size: 5, totalElements: visible.length, totalPages: Math.ceil(visible.length / 5), last: false })
    expect(page.content).toHaveLength(5)
    expect(page.content.every((p: { active: boolean }) => p.active)).toBe(true)
  })

  it('ordena por nome por padrão e pelos outros ProductSort', () => {
    const names = body(call('GET', '/catalog/products?size=100')).content.map((p: { name: string }) => p.name)
    expect(names).toEqual([...names].sort((a: string, b: string) => a.localeCompare(b, 'pt-BR')))
    const prices = body(call('GET', '/catalog/products?size=100&sort=PRICE_ASC')).content.map((p: { effectivePrice: number }) => p.effectivePrice)
    expect(prices).toEqual([...prices].sort((a: number, b: number) => a - b))
    const desc = body(call('GET', '/catalog/products?size=100&sort=PRICE_DESC')).content.map((p: { effectivePrice: number }) => p.effectivePrice)
    expect(desc).toEqual([...desc].sort((a: number, b: number) => b - a))
    const dates = body(call('GET', '/catalog/products?size=100&sort=NEWEST')).content.map((p: { createdAt: string }) => p.createdAt)
    expect(dates).toEqual([...dates].sort().reverse())
  })

  it('filtra por categoria (slug), busca e promoção', () => {
    const category = data.categories[1]
    const byCategory = body(call('GET', `/catalog/products?size=100&category=${category.slug}`)).content
    expect(byCategory.length).toBeGreaterThan(0)
    expect(byCategory.every((p: { categories: { id: string }[] }) => p.categories[0].id === category.id)).toBe(true)

    const term = visible[0].name.split(' ')[1]
    const found = body(call('GET', `/catalog/products?size=100&search=${encodeURIComponent(term.toUpperCase())}`)).content
    expect(found.length).toBeGreaterThan(0)
    expect(found.every((p: { name: string }) => p.name.toLowerCase().includes(term.toLowerCase()))).toBe(true)

    const onSale = body(call('GET', '/catalog/products?size=100&onSale=true')).content
    expect(onSale.length).toBeGreaterThan(0)
    expect(onSale.every((p: { onPromotion: boolean }) => p.onPromotion)).toBe(true)
  })

  it('categoria inexistente devolve página vazia', () => {
    expect(body(call('GET', '/catalog/products?category=nao-existe')).totalElements).toBe(0)
  })

  it('GET /catalog/products/:id e /slug/:slug; inexistente → 404', () => {
    const product = visible[0]
    expect(body(call('GET', `/catalog/products/${product.id}`)).slug).toBe(product.slug)
    expect(body(call('GET', `/catalog/products/slug/${product.slug}`)).id).toBe(product.id)
    expect(call('GET', '/catalog/products/slug/nao-existe').status).toBe(404)
    expect(call('GET', `/catalog/products/${data.products.find((p) => !p.active)?.id ?? 'x'}`).status).toBe(404)
  })

  it('o produto não expõe os campos internos do gerador', () => {
    const product = body(call('GET', `/catalog/products/${visible[0].id}`))
    expect(product).not.toHaveProperty('colorHex')
    expect(product).not.toHaveProperty('colorName')
  })

  it('best-selling ordena pelos vendidos nos últimos 30 dias; popular pelas visualizações', () => {
    const best = body(call('GET', '/catalog/products/best-selling?limit=4'))
    expect(best.length).toBeLessThanOrEqual(4)
    const sold = best.map((p: { soldQuantityLast30Days: number }) => p.soldQuantityLast30Days)
    expect(sold).toEqual([...sold].sort((a: number, b: number) => b - a))
    expect(sold.every((n: number) => n > 0)).toBe(true)
    const popular = body(call('GET', '/catalog/products/popular?limit=3')).map((p: { viewCount: number }) => p.viewCount)
    expect(popular).toEqual([...popular].sort((a: number, b: number) => b - a))
  })

  it('related traz produtos da mesma categoria, sem o próprio', () => {
    const product = visible[0]
    const related = body(call('GET', `/catalog/products/${product.id}/related?limit=8`))
    expect(related.some((p: { id: string }) => p.id === product.id)).toBe(false)
    expect(related.every((p: { categories: { id: string }[] }) => p.categories[0].id === product.categories[0].id)).toBe(true)
  })

  it('GET /catalog/categories em ordem de nome', () => {
    const names = body(call('GET', '/catalog/categories')).map((c: { name: string }) => c.name)
    expect(names).toEqual([...data.categories.map((c) => c.name)].sort((a, b) => a.localeCompare(b, 'pt-BR')))
  })

  it('POST /catalog/products/prices é leitura: devolve o preço atual de cada id', () => {
    const product = visible[0]
    const prices = body(call('POST', '/catalog/products/prices', { body: { ids: [product.id, 'nao-existe'] } }))
    expect(prices).toEqual([{ id: product.id, effectivePrice: product.effectivePrice, onPromotion: product.onPromotion, available: product.status === 'AVAILABLE' }])
  })

  it('cotação de frete (produto, carrinho e pedido manual) devolve opções', () => {
    for (const [path, payload] of [
      [`/catalog/products/${visible[0].id}/shipping-preview`, { zipCode: '01310-100' }],
      ['/shipping/calculate', { addressId: data.addresses[0].id }],
      ['/admin/manual-orders/shipping-quote', { zipCode: '01310-100', items: [] }],
    ] as const) {
      const quote = body(call('POST', path, { body: payload, ...asAdmin }))
      expect(quote.options.length).toBeGreaterThan(0)
      expect(quote.options[0]).toMatchObject({ serviceId: expect.any(String), carrierName: expect.any(String), price: expect.any(Number) })
    }
  })

  it('isWishlisted só com usuário logado', () => {
    const item = data.wishlist.find((w) => w.userId === fixedCustomer().id)!
    expect(body(call('GET', `/catalog/products/${item.productId}`, asCustomer)).isWishlisted).toBe(true)
    expect(body(call('GET', `/catalog/products/${item.productId}`)).isWishlisted).toBeUndefined()
  })
})

describe('avaliações', () => {
  it('GET /products/:id/reviews pagina e traz média e total', () => {
    const product = data.products.filter((p) => p.reviewCount > 0).sort((a, b) => b.reviewCount - a.reviewCount)[0]
    const page = body(call('GET', `/products/${product.id}/reviews?page=0&size=2`))
    expect(page.totalReviews).toBe(product.reviewCount)
    expect(page.totalElements).toBe(product.reviewCount)
    expect(page.averageRating).toBeCloseTo(product.averageRating, 1)
    expect(page.content.length).toBeLessThanOrEqual(2)
  })

  it('GET /reviews/me lista os produtos entregues ao cliente, com a avaliação quando houver', () => {
    const mine = body(call('GET', '/reviews/me', asCustomer))
    const delivered = new Set(
      data.orders.filter((o) => o.userId === fixedCustomer().id && o.status === 'DELIVERED').flatMap((o) => o.items.map((i) => i.productId)),
    )
    expect(mine.map((m: { productId: string }) => m.productId).sort()).toEqual([...delivered].sort())
  })
})

describe('site', () => {
  it.each([
    ['/site/settings', () => data.settings.siteTitle, (b: { siteTitle: string }) => b.siteTitle],
    ['/site/banners', () => data.banners.length, (b: unknown[]) => b.length],
    ['/site/nav-items', () => data.navItems.length, (b: unknown[]) => b.length],
    ['/site/payment-methods', () => data.paymentMethods.DELIVERY.length, (b: { DELIVERY: unknown[] }) => b.DELIVERY.length],
    ['/site/payment-gateway', () => data.paymentGateway.active, (b: { active: string }) => b.active],
  ])('GET %s', (path, expected, read) => {
    expect(read(body(call('GET', path)) as never)).toEqual(expected())
  })

  it('GET /site/distribution-centers devolve só os ativos para o público', () => {
    expect(body(call('GET', '/site/distribution-centers'))).toEqual(data.distributionCenters.filter((c) => c.active))
  })
})

describe('conta do cliente', () => {
  it('GET /users/me devolve o usuário do token, sem campos internos', () => {
    const me = body(call('GET', '/users/me', asCustomer))
    expect(me).toMatchObject({ id: fixedCustomer().id, email: fixedCustomer().email, role: 'CUSTOMER' })
    expect(me).not.toHaveProperty('trafficSource')
  })

  it('GET /orders pagina só os pedidos do usuário, mais recentes primeiro, com o link de pagamento só se pendente', () => {
    const page = body(call('GET', '/orders?page=0&size=50', asCustomer))
    const own = data.orders.filter((o) => o.userId === fixedCustomer().id)
    expect(page.totalElements).toBe(own.length)
    const dates = page.content.map((o: { createdAt: string }) => o.createdAt)
    expect(dates).toEqual([...dates].sort().reverse())
    expect(page.content[0]).not.toHaveProperty('customerEmail')
  })

  it('GET /addresses, /wishlist e /cart são do usuário do token', () => {
    const id = fixedCustomer().id
    expect(body(call('GET', '/addresses', asCustomer))).toHaveLength(data.addresses.filter((a) => a.userId === id).length)
    expect(body(call('GET', '/wishlist', asCustomer))).toHaveLength(data.wishlist.filter((w) => w.userId === id).length)
    const cart = body(call('GET', '/cart', asCustomer))
    const items = data.carts.filter((c) => c.userId === id)
    expect(cart.items).toHaveLength(items.length)
    expect(cart.total).toBeCloseTo(cart.items.reduce((acc: number, i: { subtotal: number }) => acc + i.subtotal, 0), 2)
    expect(cart.items[0]).toMatchObject({ productId: expect.any(String), productName: expect.any(String), unitPrice: expect.any(Number), quantity: expect.any(Number) })
  })

  it('GET /notifications pagina as do usuário; /unread-count conta as não lidas', () => {
    const own = data.notifications.filter((n) => n.userId === fixedCustomer().id)
    expect(body(call('GET', '/notifications?page=0&size=100', asCustomer)).totalElements).toBe(own.length)
    expect(body(call('GET', '/notifications/unread-count', asCustomer))).toEqual({ count: own.filter((n) => n.readAt === null).length })
  })
})

describe('painel — produtos e estoque', () => {
  it('GET /admin/products inclui inativos e filtra por active, status, categoryId e busca', () => {
    expect(body(call('GET', '/admin/products?size=100', asEmployee)).totalElements).toBe(data.products.length)
    const inactive = body(call('GET', '/admin/products?size=100&active=false', asEmployee)).content
    expect(inactive.every((p: { active: boolean }) => !p.active)).toBe(true)
    const unavailable = body(call('GET', '/admin/products?size=100&status=UNAVAILABLE', asEmployee)).content
    expect(unavailable.every((p: { status: string }) => p.status === 'UNAVAILABLE')).toBe(true)
    const category = data.categories[0]
    const byCategory = body(call('GET', `/admin/products?size=100&categoryId=${category.id}`, asEmployee)).content
    expect(byCategory.length).toBe(data.products.filter((p) => p.categories[0].id === category.id).length)
    const gtin = data.products[0].gtinEan!
    expect(body(call('GET', `/admin/products?search=${gtin}`, asEmployee)).content[0].id).toBe(data.products[0].id)
  })

  it('filtro de promoção ACTIVE / SCHEDULED / NONE', () => {
    const active = body(call('GET', '/admin/products?size=100&promotion=ACTIVE', asEmployee)).content
    expect(active.every((p: { onPromotion: boolean }) => p.onPromotion)).toBe(true)
    const none = body(call('GET', '/admin/products?size=100&promotion=NONE', asEmployee)).content
    expect(none.every((p: { promotionId?: string }) => !p.promotionId)).toBe(true)
  })

  it('GET /admin/categories com a contagem de produtos', () => {
    const list = body(call('GET', '/admin/categories', asEmployee))
    for (const category of list) {
      expect(category.productCount).toBe(data.products.filter((p) => p.categories[0].id === category.id).length)
    }
  })

  it('movimentações e lotes do produto, mais recentes primeiro, com filtro de motivo', () => {
    const product = data.products[0]
    const movements = body(call('GET', `/admin/products/${product.id}/stock-movements?size=100`, asEmployee))
    expect(movements.totalElements).toBe(data.stockMovements.filter((m) => m.productId === product.id).length)
    const dates = movements.content.map((m: { createdAt: string }) => m.createdAt)
    expect(dates).toEqual([...dates].sort().reverse())
    const purchases = body(call('GET', `/admin/products/${product.id}/stock-movements?size=100&reason=PURCHASE`, asEmployee)).content
    expect(purchases.every((m: { reason: string }) => m.reason === 'PURCHASE')).toBe(true)
    expect(body(call('GET', `/admin/products/${product.id}/stock-lots`, asEmployee)).totalElements).toBe(
      data.stockLots.filter((l) => l.productId === product.id).length,
    )
  })

  it('lotes vencendo em N dias, com saldo', () => {
    const page = body(call('GET', '/admin/stock-lots/expiring?days=60&size=100', asEmployee))
    for (const lot of page.content) {
      expect(lot.quantity).toBeGreaterThan(0)
      expect(Date.parse(lot.expiryDate) - GENERATED_AT.getTime()).toBeLessThanOrEqual(61 * 86_400_000)
    }
  })

  it('exportação em CSV', () => {
    const response = call('GET', '/admin/products/export', asEmployee)
    expect(response.headers?.['content-type']).toMatch(/text\/csv/)
    expect(response.headers?.['content-disposition']).toMatch(/attachment/)
    expect(response.text!.trim().split('\n')).toHaveLength(data.products.length + 1)
  })
})

describe('painel — pedidos', () => {
  it('GET /admin/orders: filtros de status (vários), pagamento, origem e busca', () => {
    expect(body(call('GET', '/admin/orders?size=200', asEmployee)).totalElements).toBe(data.orders.length)
    const statuses = body(call('GET', '/admin/orders?size=200&status=PENDING&status=CONFIRMED', asEmployee)).content
    expect(statuses.every((o: { status: string }) => ['PENDING', 'CONFIRMED'].includes(o.status))).toBe(true)
    expect(statuses.length).toBe(data.orders.filter((o) => ['PENDING', 'CONFIRMED'].includes(o.status)).length)
    const paid = body(call('GET', '/admin/orders?size=200&paymentStatus=PAID', asEmployee)).content
    expect(paid.every((o: { paymentStatus: string }) => o.paymentStatus === 'PAID')).toBe(true)
    const staff = body(call('GET', '/admin/orders?size=200&origin=STAFF', asEmployee)).content
    expect(staff.every((o: { origin: string }) => o.origin === 'STAFF')).toBe(true)
    const order = data.orders[3]
    expect(body(call('GET', `/admin/orders?search=${order.orderNumber}`, asEmployee)).content[0].id).toBe(order.id)
    expect(body(call('GET', `/admin/orders?search=${encodeURIComponent(order.customerEmail)}`, asEmployee)).content.length).toBeGreaterThan(0)
  })

  it('a listagem não traz itens nem histórico; o detalhe traz', () => {
    const listed = body(call('GET', '/admin/orders?size=1', asEmployee)).content[0]
    expect(listed).not.toHaveProperty('statusHistory')
    expect(listed).not.toHaveProperty('userId')
    const detail = body(call('GET', `/admin/orders/${listed.id}`, asEmployee))
    expect(detail.statusHistory.length).toBeGreaterThan(0)
    expect(detail.items.length).toBeGreaterThan(0)
  })

  it('nota fiscal do pedido; sem nota → 404', () => {
    const withInvoice = data.orders.find((o) => o.invoice)!
    expect(body(call('GET', `/admin/orders/${withInvoice.id}/invoice`, asEmployee)).status).toBe('ISSUED')
    const without = data.orders.find((o) => !o.invoice)!
    expect(call('GET', `/admin/orders/${without.id}/invoice`, asEmployee).status).toBe(404)
  })

  it('solicitações de alteração com filtro de status', () => {
    const pending = body(call('GET', '/admin/orders/change-requests?status=PENDING', asEmployee)).content
    expect(pending.length).toBe(data.orderChangeRequests.filter((r) => r.status === 'PENDING').length)
  })
})

describe('painel — pessoas', () => {
  it('GET /admin/customers com busca', () => {
    const customer = data.users.find((u) => u.role === 'CUSTOMER')!
    expect(body(call('GET', '/admin/customers?size=200', asEmployee)).totalElements).toBe(data.users.filter((u) => u.role === 'CUSTOMER').length)
    const found = body(call('GET', `/admin/customers?search=${encodeURIComponent(customer.email)}`, asEmployee)).content
    expect(found).toEqual([{ id: customer.id, name: customer.name, email: customer.email }])
  })

  it('GET /admin/customers/:id monta a visão completa do cliente', () => {
    const detail = body(call('GET', `/admin/customers/${fixedCustomer().id}`, asEmployee))
    const own = data.orders.filter((o) => o.userId === fixedCustomer().id)
    expect(detail.purchaseSummary.totalOrders).toBe(own.length)
    expect(detail.recentOrders.length).toBeGreaterThan(0)
    expect(detail.addresses.length).toBeGreaterThan(0)
    expect(detail.currentCart.length).toBe(data.carts.filter((c) => c.userId === fixedCustomer().id).length)
    expect(detail.cartTotal).toBeCloseTo(detail.currentCart.reduce((acc: number, i: { subtotal: number }) => acc + i.subtotal, 0), 2)
    expect(detail.recentPageViews.length).toBeGreaterThan(0)
  })

  it('funcionários e admins com filtros; admins só para ADMIN', () => {
    const employees = body(call('GET', '/admin/employees?size=100', asEmployee)).content
    expect(employees.every((e: { role: string }) => e.role === 'EMPLOYEE' || e.role === 'ADMIN')).toBe(true)
    expect(body(call('GET', '/admin/employees?size=100&role=EMPLOYEE', asEmployee)).content.every((e: { role: string }) => e.role === 'EMPLOYEE')).toBe(true)
    expect(body(call('GET', '/admin/admins', asAdmin)).content.every((e: { role: string }) => e.role === 'ADMIN')).toBe(true)
    expect(call('GET', '/admin/admins', asEmployee).status).toBe(403)
  })

  it('detalhe, permissões e auditoria de um funcionário', () => {
    const id = fixedEmployee().id
    expect(body(call('GET', `/admin/employees/${id}`, asAdmin)).email).toBe(fixedEmployee().email)
    expect(body(call('GET', `/admin/employees/${id}/permissions`, asAdmin)).permissions).toHaveLength(13)
    const audit = body(call('GET', `/admin/employees/${id}/audit-logs`, asAdmin))
    expect(audit.content.every((l: { actorEmail: string }) => l.actorEmail === fixedEmployee().email)).toBe(true)
  })

  it('auditoria geral com filtros, só para ADMIN', () => {
    expect(body(call('GET', '/admin/audit-logs?size=100', asAdmin)).totalElements).toBe(data.auditLogs.length)
    const orders = body(call('GET', '/admin/audit-logs?size=100&entityType=ORDER', asAdmin)).content
    expect(orders.every((l: { entityType: string }) => l.entityType === 'ORDER')).toBe(true)
    expect(call('GET', '/admin/audit-logs', asEmployee).status).toBe(403)
  })

  it('pedido manual: busca de cliente e endereços', () => {
    const customer = data.users.find((u) => u.role === 'CUSTOMER' && data.addresses.some((a) => a.userId === u.id))!
    const found = body(call('GET', `/admin/manual-orders/customers?search=${encodeURIComponent(customer.name.split(' ')[0])}`, asEmployee))
    expect(found.some((c: { id: string }) => c.id === customer.id)).toBe(true)
    expect(body(call('GET', `/admin/manual-orders/customers/${customer.id}/addresses`, asEmployee)).length).toBe(
      data.addresses.filter((a) => a.userId === customer.id).length,
    )
  })
})

describe('painel — cupons, promoções, site e analytics', () => {
  it('cupons com busca e usos', () => {
    expect(body(call('GET', '/admin/coupons', asEmployee)).totalElements).toBe(data.coupons.length)
    const coupon = data.coupons.find((c) => data.couponRedemptions.some((r) => r.couponId === c.id))!
    const redemptions = body(call('GET', `/admin/coupons/${coupon.id}/redemptions`, asEmployee))
    expect(redemptions.totalElements).toBe(data.couponRedemptions.filter((r) => r.couponId === coupon.id).length)
    expect(redemptions.content[0]).not.toHaveProperty('couponId')
  })

  it('promoções com filtro de status e detalhe com os produtos', () => {
    const active = body(call('GET', '/admin/promotions?status=ACTIVE', asEmployee)).content
    expect(active.every((p: { status: string }) => p.status === 'ACTIVE')).toBe(true)
    expect(active[0]).not.toHaveProperty('productIds')
    const promotion = data.promotions[0]
    const detail = body(call('GET', `/admin/promotions/${promotion.id}`, asEmployee))
    expect(detail.products).toHaveLength(promotion.productIds.length)
    expect(detail.products[0]).toMatchObject({ productId: expect.any(String), price: expect.any(Number), promotionalPrice: expect.any(Number) })
  })

  it('menu do painel, Melhor Envio e URL de autorização', () => {
    expect(body(call('GET', '/admin/site/nav-items', asEmployee))).toHaveLength(data.navItems.length)
    expect(body(call('GET', '/admin/site/melhor-envio', asEmployee))).toEqual({ connected: true })
    expect(body(call('GET', '/admin/site/melhor-envio/oauth/authorize-url', asEmployee)).authorizeUrl).toBeTruthy()
  })

  it('funil de conversão com as taxas calculadas', () => {
    const funnel = body(call('GET', '/admin/analytics/funnel', asAdmin))
    expect(funnel.visitors).toBeGreaterThan(0)
    expect(funnel.productViews).toBeLessThanOrEqual(funnel.visitors)
    expect(funnel.visitorToProductViewRate).toBeCloseTo(funnel.productViews / funnel.visitors, 5)
  })

  it('funil respeita o período pedido', () => {
    const day = (offset: number) => new Date(GENERATED_AT.getTime() + offset * 86_400_000).toISOString().slice(0, 10)
    const all = body(call('GET', `/admin/analytics/funnel?from=${day(-365)}&to=${day(0)}`, asAdmin))
    const week = body(call('GET', `/admin/analytics/funnel?from=${day(-7)}&to=${day(0)}`, asAdmin))
    expect(week.visitors).toBeLessThan(all.visitors)
  })

  it('canais agrupam cadastros por origem', () => {
    const channels = body(call('GET', '/admin/analytics/channels', asAdmin))
    expect(channels.reduce((acc: number, c: { signups: number }) => acc + c.signups, 0)).toBe(data.users.filter((u) => u.role === 'CUSTOMER').length)
    expect(channels.some((c: { channel: string }) => c.channel === 'Direto/não identificado')).toBe(true)
  })
})

describe('datas deslocadas', () => {
  it('com a geração 10 dias atrás, toda data da resposta anda 10 dias', () => {
    const later = new Date(GENERATED_AT.getTime() + 10 * 86_400_000)
    const product = visible[0]
    const original = body(call('GET', `/catalog/products/${product.id}`))
    const shifted = body(call('GET', `/catalog/products/${product.id}`, { now: later }))
    expect(Date.parse(shifted.createdAt) - Date.parse(original.createdAt)).toBe(10 * 86_400_000)
  })

  it('data sem hora de validade de lote também anda; data de nascimento não', () => {
    const later = new Date(GENERATED_AT.getTime() + 10 * 86_400_000)
    const lot = data.stockLots.find((l) => l.expiryDate)!
    const lots = body(call('GET', `/admin/products/${lot.productId}/stock-lots?size=100`, { ...asEmployee, now: later })).content
    const shiftedLot = lots.find((l: { id: string }) => l.id === lot.id)
    expect(Date.parse(shiftedLot.expiryDate) - Date.parse(lot.expiryDate!)).toBe(10 * 86_400_000)
    const me = body(call('GET', '/users/me', { ...asCustomer, now: later }))
    expect(me.birthDate).toBe(fixedCustomer().birthDate)
  })

  it('filtros de data da requisição são convertidos para a data dos dados', () => {
    const later = new Date(GENERATED_AT.getTime() + 100 * 86_400_000)
    const day = (offset: number) => new Date(later.getTime() + offset * 86_400_000).toISOString().slice(0, 10)
    const week = body(call('GET', `/admin/analytics/funnel?from=${day(-7)}&to=${day(0)}`, { ...asAdmin, now: later }))
    const original = body(call('GET', `/admin/analytics/funnel?from=${day(-107)}&to=${day(-100)}`, asAdmin))
    expect(week).toEqual(original)
  })
})
