import { asAdmin, asCustomer, asEmployee, body, call, data, fixedCustomer } from './fake-backend-helpers'

describe('acesso', () => {
  it.each(['/users/me', '/cart', '/orders', '/wishlist', '/notifications', '/reviews/me', '/addresses'])(
    '%s sem login → 401 sem corpo, como o filtro do Spring',
    (path) => {
      const response = call('GET', path)
      expect(response.status).toBe(401)
      expect(response.body).toBeUndefined()
    },
  )

  it('painel com token de cliente → 403', () => {
    expect(call('GET', '/admin/orders', asCustomer).status).toBe(403)
  })

  it('painel com token de funcionário ou admin → 200', () => {
    expect(call('GET', '/admin/orders', asEmployee).status).toBe(200)
    expect(call('GET', '/admin/orders', asAdmin).status).toBe(200)
  })

  it('rotas públicas não exigem login', () => {
    expect(call('GET', '/catalog/products').status).toBe(200)
    expect(call('GET', '/site/settings').status).toBe(200)
  })

  it('rota desconhecida → 404 com mensagem', () => {
    const response = call('GET', '/nao-existe')
    expect(response.status).toBe(404)
    expect(body(response).message).toBeTruthy()
  })

  it('id desconhecido → 404', () => {
    expect(call('GET', '/admin/orders/nao-existe', asEmployee).status).toBe(404)
    expect(call('GET', '/admin/customers/nao-existe', asEmployee).status).toBe(404)
  })

  it('escrita sem login em rota autenticada → 401', () => {
    expect(call('POST', '/orders', { body: {} }).status).toBe(401)
    expect(call('PUT', '/admin/products/x', { body: {} }).status).toBe(401)
  })
})

describe('escritas sem efeito', () => {
  it('criação → 201 com o corpo + id + createdAt, e nada muda na leitura seguinte', () => {
    const before = body(call('GET', '/admin/categories', asEmployee))
    const response = call('POST', '/admin/categories', { ...asEmployee, body: { name: 'Nova', slug: 'nova' } })
    expect(response.status).toBe(201)
    expect(body(response)).toMatchObject({ name: 'Nova', slug: 'nova', id: expect.any(String), createdAt: expect.any(String) })
    expect(body(call('GET', '/admin/categories', asEmployee))).toEqual(before)
  })

  it('edição → 200 com o registro mesclado com o corpo, sem alterar os dados', () => {
    const product = data.products[0]
    const response = call('PUT', `/admin/products/${product.id}`, { ...asEmployee, body: { name: 'Nome novo' } })
    expect(response.status).toBe(200)
    expect(body(response)).toMatchObject({ id: product.id, slug: product.slug, name: 'Nome novo' })
    expect(body(call('GET', `/admin/products/${product.id}`, asEmployee)).name).toBe(product.name)
  })

  it('mudança de status de pedido devolve o detalhe com o status pedido', () => {
    const order = data.orders[0]
    const response = call('PATCH', `/admin/orders/${order.id}/status`, { ...asEmployee, body: { status: 'CANCELLED', reason: 'x' } })
    expect(response.status).toBe(200)
    expect(body(response)).toMatchObject({ id: order.id, status: 'CANCELLED', statusHistory: expect.any(Array) })
    expect(body(call('GET', `/admin/orders/${order.id}`, asEmployee)).status).toBe(order.status)
  })

  it('exclusão → 204', () => {
    expect(call('DELETE', `/admin/products/${data.products[0].id}`, asEmployee).status).toBe(204)
    expect(call('DELETE', `/wishlist/${data.products[0].id}`, asCustomer).status).toBe(204)
  })

  it('carrinho: adicionar, alterar e remover devolvem o carrinho atual, sem mudança', () => {
    const cart = body(call('GET', '/cart', asCustomer))
    expect(body(call('POST', '/cart/items', { ...asCustomer, body: { productId: data.products[1].id, quantity: 1 } }))).toEqual(cart)
    expect(body(call('PATCH', `/cart/items/${data.products[1].id}`, { ...asCustomer, body: { quantity: 3 } }))).toEqual(cart)
    expect(body(call('DELETE', `/cart/items/${data.products[1].id}`, asCustomer))).toEqual(cart)
    expect(body(call('POST', '/cart/merge', { ...asCustomer, body: { items: [] } }))).toEqual(cart)
  })

  it('cupom no carrinho: código existente e ativo calcula o desconto; outro → 400', () => {
    const coupon = data.coupons.find((c) => c.status === 'ACTIVE' && c.minSubtotal === null)!
    const valid = call('POST', '/cart/coupon', { ...asCustomer, body: { code: coupon.code.toLowerCase() } })
    expect(valid.status).toBe(200)
    expect(body(valid)).toMatchObject({ code: coupon.code, discountAmount: expect.any(Number), subtotal: expect.any(Number) })
    expect(call('POST', '/cart/coupon', { ...asCustomer, body: { code: 'NAOEXISTE' } }).status).toBe(400)
  })

  it('POST /orders → pedido PENDING com checkoutUrl /orders', () => {
    const response = call('POST', '/orders', { ...asCustomer, body: { deliveryMethod: 'DELIVERY', paymentMethod: 'PIX', addressId: data.addresses[0].id } })
    expect(response.status).toBe(201)
    expect(body(response)).toMatchObject({ status: 'PENDING', paymentStatus: 'PENDING', checkoutUrl: '/orders', paymentMethod: 'PIX' })
    expect(body(response).items.length).toBeGreaterThan(0)
  })

  it('pedido manual devolve o detalhe de um pedido PENDING', () => {
    const response = call('POST', '/admin/manual-orders', {
      ...asEmployee,
      body: { customerId: fixedCustomer().id, items: [{ productId: data.products[0].id, quantity: 2 }], deliveryMethod: 'DELIVERY', paymentMethod: 'PIX', paymentReceived: false },
    })
    expect(response.status).toBe(201)
    expect(body(response)).toMatchObject({ status: 'PENDING', origin: 'STAFF', items: [expect.objectContaining({ quantity: 2 })] })
  })

  it('upload → URL de uma imagem que existe', () => {
    const response = call('POST', '/upload/image', { ...asEmployee, contentType: 'multipart/form-data; boundary=x' })
    expect(response.status).toBe(200)
    expect(body(response).url).toMatch(/^\/demo\/images\//)
  })

  it('importação de CSV devolve relatório vazio', () => {
    expect(body(call('POST', '/admin/products/import', { ...asEmployee, contentType: 'multipart/form-data' }))).toEqual({
      createdCount: 0,
      created: [],
      errors: [],
      warnings: [{ row: 0, message: expect.stringMatching(/demonstração/) }],
    })
  })

  it('exclusão em lote devolve sucesso para cada id', () => {
    expect(body(call('POST', '/admin/employees/bulk-delete', { ...asAdmin, body: { ids: ['a', 'b'] } }))).toEqual({ successCount: 2, failures: [] })
  })

  it('2FA do perfil devolve segredo e códigos de recuperação', () => {
    expect(body(call('POST', '/users/me/mfa/setup/start', asCustomer))).toMatchObject({ secret: expect.any(String), otpauthUri: expect.stringMatching(/^otpauth:/) })
    expect(body(call('POST', '/users/me/mfa/setup/confirm', { ...asCustomer, body: { code: '123456' } })).recoveryCodes).toHaveLength(10)
  })

  it.each([
    ['POST', '/tracking/page-views'],
    ['POST', '/catalog/products/x/views'],
    ['PATCH', '/notifications/read-all'],
  ])('%s %s → 204', (method, path) => {
    expect(call(method, path, { ...asCustomer, body: {} }).status).toBe(204)
  })

  it('configurações do site devolvem as configurações com o corpo aplicado', () => {
    const response = call('PUT', '/site/settings/contact', { ...asAdmin, body: { contactEmail: 'outro@demo.com' } })
    expect(body(response)).toMatchObject({ siteTitle: data.settings.siteTitle, contactEmail: 'outro@demo.com' })
  })

  it('reordenar o menu devolve o menu atual', () => {
    expect(body(call('PATCH', '/admin/site/nav-items/order', { ...asAdmin, body: { ids: [] } }))).toHaveLength(data.navItems.length)
  })
})
