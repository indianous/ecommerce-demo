import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import Home from '../page'
import type { Product } from '@/types'

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    categoryId: 'cat-1',
    categoryName: 'Electronics',
    name: 'Teclado Mecânico',
    slug: 'teclado-mecanico',
    price: 199.9,
    stockQuantity: 10,
    active: true,
    status: 'AVAILABLE',
    createdAt: '2026-06-29T00:00:00',
    updatedAt: '2026-06-29T00:00:00',
    ...overrides,
  }
}

const popularProduct = makeProduct({ id: 'pop-1', name: 'Produto Popular' })
const bestSellingProduct = makeProduct({ id: 'best-1', name: 'Produto Mais Vendido' })

const server = setupServer(
  http.get('http://localhost:8080/api/v1/catalog/products/popular', () => HttpResponse.json([popularProduct])),
  http.get('http://localhost:8080/api/v1/catalog/products/best-selling', () => HttpResponse.json([bestSellingProduct])),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Home page', () => {
  it('renderiza as seções de produtos populares e mais vendidos com ProductCard para cada item', async () => {
    const jsx = await Home()
    render(jsx)

    expect(screen.getByRole('heading', { name: /produtos populares/i })).toBeInTheDocument()
    expect(screen.getByText('Produto Popular')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /mais vendidos/i })).toBeInTheDocument()
    expect(screen.getByText('Produto Mais Vendido')).toBeInTheDocument()
  })

  it('mantém o hero e o botão "Ver catálogo"', async () => {
    const jsx = await Home()
    render(jsx)

    expect(screen.getByRole('heading', { name: /tudo o que você precisa/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver catálogo/i })).toHaveAttribute('href', '/catalog')
  })

  it('quando "populares" falha/retorna vazio, a seção some sem quebrar a de mais vendidos', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/catalog/products/popular', () => HttpResponse.json([], { status: 500 })),
    )
    const jsx = await Home()
    render(jsx)

    expect(screen.queryByRole('heading', { name: /produtos populares/i })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /mais vendidos/i })).toBeInTheDocument()
    expect(screen.getByText('Produto Mais Vendido')).toBeInTheDocument()
  })

  it('quando "mais vendidos" falha/retorna vazio, a seção some sem quebrar a de populares', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/catalog/products/best-selling', () => HttpResponse.json([], { status: 500 })),
    )
    const jsx = await Home()
    render(jsx)

    expect(screen.getByRole('heading', { name: /produtos populares/i })).toBeInTheDocument()
    expect(screen.getByText('Produto Popular')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /mais vendidos/i })).not.toBeInTheDocument()
  })
})
