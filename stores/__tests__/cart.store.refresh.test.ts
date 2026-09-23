import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { act } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { useCartStore } from '../cart.store'
import { useAuthStore } from '../auth.store'

let requestedIds: string[] | null = null

const server = setupServer(
  http.post('/api/catalog/prices', async ({ request }) => {
    requestedIds = ((await request.json()) as { ids: string[] }).ids
    return HttpResponse.json([
      { id: 'prod-1', effectivePrice: 80, onPromotion: true, available: true },
      { id: 'prod-2', effectivePrice: null, onPromotion: false, available: false },
    ])
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(async () => {
  server.resetHandlers()
  requestedIds = null
  await act(async () => {
    useCartStore.setState({ items: [] })
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

describe('cart.store — refreshGuestPrices', () => {
  it('visitante: busca os preços atuais, atualiza o preço e tira o item indisponível', async () => {
    useCartStore.setState({
      items: [
        { productId: 'prod-1', name: 'Teclado', price: 100, quantity: 2 },
        { productId: 'prod-2', name: 'Mouse', price: 50, quantity: 1 },
      ],
    })

    const result = await useCartStore.getState().refreshGuestPrices()

    expect(requestedIds).toEqual(['prod-1', 'prod-2'])
    expect(useCartStore.getState().items).toEqual([
      { productId: 'prod-1', name: 'Teclado', price: 80, quantity: 2 },
    ])
    expect(result.removed).toEqual(['Mouse'])
  })

  it('carrinho vazio: não chama a rede', async () => {
    const result = await useCartStore.getState().refreshGuestPrices()

    expect(requestedIds).toBeNull()
    expect(result.removed).toEqual([])
  })

  it('logado: não faz nada (o carrinho vem do servidor com o preço certo)', async () => {
    useAuthStore.setState({ accessToken: 'tok', isAuthenticated: true, role: 'CUSTOMER' })
    useCartStore.setState({ items: [{ productId: 'prod-1', name: 'Teclado', price: 100, quantity: 1 }] })

    await useCartStore.getState().refreshGuestPrices()

    expect(requestedIds).toBeNull()
    expect(useCartStore.getState().items[0].price).toBe(100)
  })

  it('erro de rede: mantém o carrinho como está', async () => {
    server.use(http.post('/api/catalog/prices', () => HttpResponse.error()))
    useCartStore.setState({ items: [{ productId: 'prod-1', name: 'Teclado', price: 100, quantity: 1 }] })

    const result = await useCartStore.getState().refreshGuestPrices()

    expect(useCartStore.getState().items[0].price).toBe(100)
    expect(result.removed).toEqual([])
  })
})
