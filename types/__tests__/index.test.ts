import type { User, Product, CartItem } from '../index'

describe('Domain types', () => {
  it('User type has correct shape', () => {
    const user: User = {
      id: '1',
      name: 'João Victor',
      email: 'joao@example.com',
      role: 'CUSTOMER',
    }
    expect(user.role).toBe('CUSTOMER')
  })

  it('Product type has correct shape', () => {
    const product: Product = {
      id: '1',
      categoryId: 'cat-1',
      categoryName: 'Electronics',
      name: 'Mechanical Keyboard',
      slug: 'mechanical-keyboard',
      price: 499.90,
      stockQuantity: 10,
      active: true,
    }
    expect(product.price).toBeGreaterThan(0)
    expect(product.stockQuantity).toBe(10)
  })

  it('CartItem links product and quantity', () => {
    const product: Product = {
      id: '1',
      categoryId: 'cat-2',
      categoryName: 'Electronics',
      name: 'Wireless Mouse',
      slug: 'wireless-mouse',
      price: 199,
      stockQuantity: 5,
      active: true,
    }
    const item: CartItem = { product, quantity: 2 }
    expect(item.quantity).toBe(2)
  })
})
