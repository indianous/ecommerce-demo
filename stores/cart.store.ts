import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@/types'
import { useAuthStore } from '@/stores/auth.store'
import { authFetch } from '@/lib/authFetch'

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
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: async (item) => {
        if (!useAuthStore.getState().isAuthenticated) {
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
        if (!useAuthStore.getState().isAuthenticated) {
          set((state) => ({ items: state.items.filter((i) => i.productId !== productId) }))
          return
        }
        const cart = await fetchServerCart(`/api/cart/items/${productId}`, { method: 'DELETE' })
        set({ items: mapServerCart(cart) })
      },

      updateQuantity: async (productId, quantity) => {
        if (!useAuthStore.getState().isAuthenticated) {
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
        if (localItems.length === 0) return
        const cart = await fetchServerCart('/api/cart/merge', {
          method: 'POST',
          body: JSON.stringify({
            items: localItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          }),
        })
        set({ items: mapServerCart(cart) })
      },
    }),
    { name: 'cart-storage' },
  ),
)

export const selectCartTotal = (state: CartStore): number =>
  state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

export const selectItemCount = (state: CartStore): number =>
  state.items.reduce((sum, item) => sum + item.quantity, 0)
