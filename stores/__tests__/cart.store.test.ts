import { afterEach, describe, expect, it } from 'vitest'
import { useCartStore, selectCartTotal, selectItemCount } from '../cart.store'

const getStore = () => useCartStore.getState()

afterEach(() => {
  useCartStore.getState().clearCart()
})

describe('cart store', () => {
  it('starts with empty cart', () => {
    expect(getStore().items).toHaveLength(0)
  })

  it('adds item to cart with quantity 1', () => {
    getStore().addItem({ productId: 'p1', name: 'Laptop', price: 2999 })
    const { items } = getStore()
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(1)
    expect(items[0].name).toBe('Laptop')
  })

  it('increments quantity when same product is added again', () => {
    getStore().addItem({ productId: 'p1', name: 'Laptop', price: 2999 })
    getStore().addItem({ productId: 'p1', name: 'Laptop', price: 2999 })
    expect(getStore().items[0].quantity).toBe(2)
  })

  it('keeps separate entries for different products', () => {
    getStore().addItem({ productId: 'p1', name: 'Laptop', price: 2999 })
    getStore().addItem({ productId: 'p2', name: 'Mouse', price: 99 })
    expect(getStore().items).toHaveLength(2)
  })

  it('removes item by productId', () => {
    getStore().addItem({ productId: 'p1', name: 'Laptop', price: 2999 })
    getStore().removeItem('p1')
    expect(getStore().items).toHaveLength(0)
  })

  it('updates item quantity', () => {
    getStore().addItem({ productId: 'p1', name: 'Laptop', price: 2999 })
    getStore().updateQuantity('p1', 5)
    expect(getStore().items[0].quantity).toBe(5)
  })

  it('removes item when quantity is updated to 0', () => {
    getStore().addItem({ productId: 'p1', name: 'Laptop', price: 2999 })
    getStore().updateQuantity('p1', 0)
    expect(getStore().items).toHaveLength(0)
  })

  it('calculates total correctly', () => {
    getStore().addItem({ productId: 'p1', name: 'Laptop', price: 2999 })
    getStore().updateQuantity('p1', 2)
    getStore().addItem({ productId: 'p2', name: 'Mouse', price: 99 })
    expect(selectCartTotal(getStore())).toBe(6097)
  })

  it('calculates total item count', () => {
    getStore().addItem({ productId: 'p1', name: 'Laptop', price: 2999 })
    getStore().updateQuantity('p1', 3)
    getStore().addItem({ productId: 'p2', name: 'Mouse', price: 99 })
    expect(selectItemCount(getStore())).toBe(4)
  })

  it('clears all items', () => {
    getStore().addItem({ productId: 'p1', name: 'Laptop', price: 2999 })
    getStore().addItem({ productId: 'p2', name: 'Mouse', price: 99 })
    getStore().clearCart()
    expect(getStore().items).toHaveLength(0)
  })
})
