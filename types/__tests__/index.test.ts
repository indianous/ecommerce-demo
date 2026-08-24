import type { User, Product, CartItem, Category } from '../index'

const category: Category = { id: 'cat-1', name: 'Electronics', slug: 'electronics' }

describe('Domain types', () => {
  it('User type has correct shape', () => {
    const user: User = {
      id: '1',
      name: 'João Victor',
      email: 'joao@example.com',
      role: 'CUSTOMER',
      permissions: [],
      phone: null,
      birthDate: null,
      gender: 'PREFIRO_NAO_DIZER',
    }
    expect(user.role).toBe('CUSTOMER')
  })

  it('Product type has correct shape', () => {
    const product: Product = {
      id: '1',
      categories: [category],
      name: 'Mechanical Keyboard',
      slug: 'mechanical-keyboard',
      price: 499.90,
      stockQuantity: 10,
      imageUrls: [],
      active: true,
      status: 'AVAILABLE',
      createdAt: '2026-01-01T00:00:00',
      updatedAt: '2026-01-01T00:00:00',
    }
    expect(product.price).toBeGreaterThan(0)
    expect(product.stockQuantity).toBe(10)
  })

  it('CartItem links product and quantity', () => {
    const product: Product = {
      id: '1',
      categories: [category],
      name: 'Wireless Mouse',
      slug: 'wireless-mouse',
      price: 199,
      stockQuantity: 5,
      imageUrls: [],
      active: true,
      status: 'AVAILABLE',
      createdAt: '2026-01-01T00:00:00',
      updatedAt: '2026-01-01T00:00:00',
    }
    const item: CartItem = { productId: product.id, name: product.name, price: product.price, quantity: 2 }
    expect(item.quantity).toBe(2)
  })
})
