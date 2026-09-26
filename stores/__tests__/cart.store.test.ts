import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { act } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { useCartStore } from '../cart.store'
import { useAuthStore } from '../auth.store'

const serverCart = {
  items: [
    { productId: 'prod-1', productName: 'Teclado', imageUrl: null, unitPrice: 100, quantity: 2, subtotal: 200 },
  ],
  total: 200,
}

const server = setupServer(
  http.post('/api/cart/items', () => HttpResponse.json(serverCart)),
  http.patch('/api/cart/items/:productId', () => HttpResponse.json(serverCart)),
  http.delete('/api/cart/items/:productId', () => HttpResponse.json({ items: [], total: 0 })),
  http.post('/api/cart/merge', () => HttpResponse.json(serverCart)),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  await act(async () => {
    useCartStore.setState({ items: [] })
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

describe('cart.store — anônimo', () => {
  it('addItem adiciona localmente, sem chamada de rede', async () => {
    await useCartStore.getState().addItem({ productId: 'prod-1', name: 'Teclado', price: 100 })

    expect(useCartStore.getState().items).toEqual([
      { productId: 'prod-1', name: 'Teclado', price: 100, quantity: 1 },
    ])
  })

  it('addItem duas vezes incrementa a quantidade localmente', async () => {
    await useCartStore.getState().addItem({ productId: 'prod-1', name: 'Teclado', price: 100 })
    await useCartStore.getState().addItem({ productId: 'prod-1', name: 'Teclado', price: 100 })

    expect(useCartStore.getState().items[0].quantity).toBe(2)
  })

  it('removeItem remove localmente', async () => {
    await useCartStore.getState().addItem({ productId: 'prod-1', name: 'Teclado', price: 100 })
    await useCartStore.getState().removeItem('prod-1')

    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('updateQuantity(0) remove o item localmente', async () => {
    await useCartStore.getState().addItem({ productId: 'prod-1', name: 'Teclado', price: 100 })
    await useCartStore.getState().updateQuantity('prod-1', 0)

    expect(useCartStore.getState().items).toHaveLength(0)
  })
})

describe('cart.store — autenticado', () => {
  beforeEach(async () => {
    await act(async () => {
      useAuthStore.setState({ accessToken: 'mock-token', isAuthenticated: true })
    })
  })

  it('addItem chama POST /api/cart/items e atualiza items a partir da resposta do servidor', async () => {
    await useCartStore.getState().addItem({ productId: 'prod-1', name: 'Teclado', price: 100 })

    expect(useCartStore.getState().items).toEqual([
      { productId: 'prod-1', name: 'Teclado', price: 100, quantity: 2, imageUrl: undefined },
    ])
  })

  it('addItem: falha de rede não atualiza items e propaga o erro', async () => {
    server.use(http.post('/api/cart/items', () => HttpResponse.json({ message: 'Erro' }, { status: 500 })))

    await expect(
      useCartStore.getState().addItem({ productId: 'prod-1', name: 'Teclado', price: 100 }),
    ).rejects.toThrow()

    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('removeItem chama DELETE e atualiza items a partir da resposta do servidor', async () => {
    await useCartStore.getState().removeItem('prod-1')
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('updateQuantity chama PATCH e atualiza items a partir da resposta do servidor', async () => {
    await useCartStore.getState().updateQuantity('prod-1', 5)
    expect(useCartStore.getState().items[0].quantity).toBe(2)
  })

  it('mergeOnLogin com items locais chama POST /api/cart/merge e substitui items pelo resultado', async () => {
    await act(async () => {
      useCartStore.setState({ items: [{ productId: 'prod-2', name: 'Mouse', price: 50, quantity: 1 }] })
    })

    await useCartStore.getState().mergeOnLogin()

    expect(useCartStore.getState().items).toEqual([
      { productId: 'prod-1', name: 'Teclado', price: 100, quantity: 2, imageUrl: undefined },
    ])
  })

  it('mergeOnLogin sem items locais não faz chamada nenhuma', async () => {
    let called = false
    server.use(http.post('/api/cart/merge', () => {
      called = true
      return HttpResponse.json(serverCart)
    }))

    await useCartStore.getState().mergeOnLogin()

    expect(called).toBe(false)
  })
})

describe('cart.store — clearCart', () => {
  it('sempre só reseta o estado local, sem chamada de rede, independente de autenticação', async () => {
    await act(async () => {
      useCartStore.setState({ items: [{ productId: 'prod-1', name: 'Teclado', price: 100, quantity: 1 }] })
      useAuthStore.setState({ accessToken: 'token', isAuthenticated: true })
    })

    await useCartStore.getState().clearCart()

    expect(useCartStore.getState().items).toHaveLength(0)
  })
})

describe('cart.store — equipe na loja (plano 66, etapa 4)', () => {
  let serverCalls = 0

  beforeEach(async () => {
    serverCalls = 0
    server.use(
      http.all('/api/cart/*', () => {
        serverCalls++
        return HttpResponse.json(serverCart)
      }),
    )
    await act(async () => {
      useAuthStore.setState({ accessToken: 'token-staff', isAuthenticated: true, role: 'ADMIN' })
    })
  })

  it('addItem, updateQuantity e removeItem ficam no navegador, sem chamar /api/cart', async () => {
    await useCartStore.getState().addItem({ productId: 'prod-9', name: 'Cabo', price: 10 })
    await useCartStore.getState().updateQuantity('prod-9', 3)
    expect(useCartStore.getState().items).toEqual([{ productId: 'prod-9', name: 'Cabo', price: 10, quantity: 3 }])

    await useCartStore.getState().removeItem('prod-9')

    expect(useCartStore.getState().items).toEqual([])
    expect(serverCalls).toBe(0)
  })

  it('mergeOnLogin (login da equipe) não leva o carrinho do navegador para a conta da equipe', async () => {
    useCartStore.setState({ items: [{ productId: 'prod-2', name: 'Mouse', price: 50, quantity: 1 }] })

    await useCartStore.getState().mergeOnLogin()

    expect(serverCalls).toBe(0)
    expect(useCartStore.getState().items).toHaveLength(1)
  })
})
