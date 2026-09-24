import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { POST as createOrder } from '../route'
import { GET as searchCustomers, POST as createCustomer } from '../customers/route'
import { GET as listAddresses, POST as createAddress } from '../customers/[id]/addresses/route'
import { POST as quoteShipping } from '../shipping-quote/route'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

function makeRequest(body: unknown, url = 'http://localhost:3000/api/x', authorization = 'Bearer tok') {
  return {
    url,
    headers: { get: (name: string) => (name === 'Authorization' ? authorization : null) },
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

function lastCall() {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return { url, init, auth: (init.headers as Record<string, string>)['Authorization'] }
}

const params = (id: string) => ({ params: Promise.resolve({ id }) })

describe('/api/admin/manual-orders (BFF)', () => {
  it('POST cria o pedido repassando corpo e Authorization; 422 volta com a mensagem', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Estoque insuficiente' }, { status: 422 }))
    const body = { customerId: 'c1', items: [{ productId: 'p1', quantity: 2 }], deliveryMethod: 'PICKUP', paymentMethod: 'PIX', paymentReceived: false }

    const response = await createOrder(makeRequest(body))

    const { url, init, auth } = lastCall()
    expect(url).toMatch(/\/admin\/manual-orders$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual(body)
    expect(auth).toBe('Bearer tok')
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ message: 'Estoque insuficiente' })
  })

  it('GET /customers repassa a busca', async () => {
    fetchMock.mockResolvedValueOnce(Response.json([]))

    await searchCustomers(makeRequest(undefined, 'http://localhost:3000/api/admin/manual-orders/customers?search=ana'))

    expect(lastCall().url).toMatch(/\/admin\/manual-orders\/customers\?search=ana$/)
    expect(lastCall().auth).toBe('Bearer tok')
  })

  it('POST /customers: 409 volta com o cliente existente', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Já existe', customer: { id: 'c1' } }, { status: 409 }))

    const response = await createCustomer(makeRequest({ name: 'Ana', email: 'ana@test.com' }))

    expect(lastCall().init.method).toBe('POST')
    expect(response.status).toBe(409)
    expect((await response.json()).customer.id).toBe('c1')
  })

  it('GET e POST /customers/{id}/addresses usam o id do cliente', async () => {
    fetchMock.mockResolvedValueOnce(Response.json([]))
    await listAddresses(makeRequest(undefined), params('c1'))
    expect(lastCall().url).toMatch(/\/admin\/manual-orders\/customers\/c1\/addresses$/)

    fetchMock.mockReset()
    fetchMock.mockResolvedValueOnce(Response.json({ id: 'a1' }, { status: 201 }))
    const response = await createAddress(makeRequest({ street: 'Rua A' }), params('c1'))
    expect(lastCall().init.method).toBe('POST')
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ street: 'Rua A' })
    expect(response.status).toBe(201)
  })

  it('POST /shipping-quote repassa o corpo; 403 volta como veio', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'Acesso negado' }, { status: 403 }))
    const body = { customerId: 'c1', addressId: 'a1', items: [{ productId: 'p1', quantity: 1 }] }

    const response = await quoteShipping(makeRequest(body))

    expect(lastCall().url).toMatch(/\/admin\/manual-orders\/shipping-quote$/)
    expect(JSON.parse(lastCall().init.body as string)).toEqual(body)
    expect(response.status).toBe(403)
  })
})
