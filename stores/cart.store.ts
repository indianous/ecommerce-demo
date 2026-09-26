import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, ProductPrice } from '@/types'
import { useAuthStore } from '@/stores/auth.store'
import { authFetch } from '@/lib/authFetch'
import { selectStorefrontSession } from '@/stores/storefront-session'

interface ServerCartItem {
  productId: string
  productName: string
  imageUrl: string | null
  unitPrice: number
  quantity: number
  subtotal: number
}

interface ServerCart {
  items: ServerCartItem[]
  total: number
}

function mapServerCart(cart: ServerCart): CartItem[] {
  return cart.items.map((i) => ({
    productId: i.productId,
    name: i.productName,
    price: i.unitPrice,
    quantity: i.quantity,
    imageUrl: i.imageUrl ?? undefined,
  }))
}

/** Carrinho no servidor só para cliente logado; visitante e equipe na loja usam o do navegador. */
function hasServerCart(): boolean {
  return selectStorefrontSession(useAuthStore.getState()).isAuthenticated
}

async function fetchServerCart(path: string, init?: RequestInit): Promise<ServerCart> {
  const res = await authFetch(path, { ...init, headers: { 'Content-Type': 'application/json' } })
  if (!res.ok) throw new Error('Erro ao atualizar o carrinho')
  return res.json()
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => Promise<void>
  removeItem: (productId: string) => Promise<void>
  updateQuantity: (productId: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  mergeOnLogin: () => Promise<void>
  /**
   * Visitante: o carrinho guarda o preço do momento em que o item entrou. Atualiza pelos preços atuais
   * e tira os itens que deixaram de estar à venda. Devolve os nomes dos itens tirados.
   */
  refreshGuestPrices: () => Promise<{ removed: string[] }>
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: async (item) => {
        if (!hasServerCart()) {
          set((state) => {
            const existing = state.items.find((i) => i.productId === item.productId)
            if (existing) {
              return {
                items: state.items.map((i) =>
                  i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i,
                ),
              }
            }
            return { items: [...state.items, { ...item, quantity: 1 }] }
          })
          return
        }
        const cart = await fetchServerCart('/api/cart/items', {
          method: 'POST',
          body: JSON.stringify({ productId: item.productId, quantity: 1 }),
        })
        set({ items: mapServerCart(cart) })
      },

      removeItem: async (productId) => {
        if (!hasServerCart()) {
          set((state) => ({ items: state.items.filter((i) => i.productId !== productId) }))
          return
        }
        const cart = await fetchServerCart(`/api/cart/items/${productId}`, { method: 'DELETE' })
        set({ items: mapServerCart(cart) })
      },

      updateQuantity: async (productId, quantity) => {
        if (!hasServerCart()) {
          set((state) => ({
            items:
              quantity <= 0
                ? state.items.filter((i) => i.productId !== productId)
                : state.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
          }))
          return
        }
        const cart = await fetchServerCart(`/api/cart/items/${productId}`, {
          method: 'PATCH',
          body: JSON.stringify({ quantity }),
        })
        set({ items: mapServerCart(cart) })
      },

      clearCart: async () => {
        set({ items: [] })
      },

      mergeOnLogin: async () => {
        const localItems = get().items
        // login da equipe: o carrinho do navegador não vai para a conta dela
        if (localItems.length === 0 || !hasServerCart()) return
        const cart = await fetchServerCart('/api/cart/merge', {
          method: 'POST',
          body: JSON.stringify({
            items: localItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          }),
        })
        set({ items: mapServerCart(cart) })
      },

      refreshGuestPrices: async () => {
        const items = get().items
        if (hasServerCart() || items.length === 0) return { removed: [] }
        let prices: ProductPrice[]
        try {
          const res = await fetch('/api/catalog/prices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: items.map((i) => i.productId) }),
          })
          if (!res.ok) return { removed: [] }
          prices = await res.json()
        } catch {
          return { removed: [] }
        }
        const byId = new Map(prices.map((p) => [p.id, p]))
        const removed: string[] = []
        const next: CartItem[] = []
        for (const item of items) {
          const current = byId.get(item.productId)
          if (!current) {
            next.push(item)
          } else if (!current.available || current.effectivePrice === null) {
            removed.push(item.name)
          } else {
            next.push({ ...item, price: current.effectivePrice })
          }
        }
        set({ items: next })
        return { removed }
      },
    }),
    { name: 'cart-storage' },
  ),
)

export const selectCartTotal = (state: CartStore): number =>
  state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

export const selectItemCount = (state: CartStore): number =>
  state.items.reduce((sum, item) => sum + item.quantity, 0)
