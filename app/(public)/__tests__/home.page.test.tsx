import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import Home from '../page'
import type { Banner, Product } from '@/types'

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ToastProvider>
      {ui}
      <ToastViewport />
    </ToastProvider>,
  )
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    categories: [{ id: 'cat-1', name: 'Electronics', slug: 'electronics' }],
    name: 'Teclado Mecânico',
    slug: 'teclado-mecanico',
    price: 199.9,
    stockQuantity: 10,
    imageUrls: [],
    active: true,
    status: 'AVAILABLE',
    createdAt: '2026-06-29T00:00:00',
    updatedAt: '2026-06-29T00:00:00',
    ...overrides,
  }
}

function makeBanner(overrides: Partial<Banner> = {}): Banner {
  return {
    id: 'banner-1',
    imageUrl: 'https://cdn.example.com/banner-1.jpg',
    linkUrl: null,
    position: 0,
    ...overrides,
  }
}

const popularProduct = makeProduct({ id: 'pop-1', name: 'Produto Popular' })
const bestSellingProduct = makeProduct({ id: 'best-1', name: 'Produto Mais Vendido' })

const server = setupServer(
  http.get('http://localhost:8080/api/v1/catalog/products/popular', () => HttpResponse.json([popularProduct])),
  http.get('http://localhost:8080/api/v1/catalog/products/best-selling', () => HttpResponse.json([bestSellingProduct])),
  http.get('http://localhost:8080/api/v1/site/banners', () => HttpResponse.json([])),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Home page', () => {
  it('renderiza as seções de produtos populares e mais vendidos com ProductCard para cada item', async () => {
    const jsx = await Home()
    renderWithProviders(jsx)

    expect(screen.getByRole('heading', { name: /produtos populares/i })).toBeInTheDocument()
    expect(screen.getByText('Produto Popular')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /mais vendidos/i })).toBeInTheDocument()
    expect(screen.getByText('Produto Mais Vendido')).toBeInTheDocument()
  })

  it('quando "populares" falha/retorna vazio, a seção some sem quebrar a de mais vendidos', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/catalog/products/popular', () => HttpResponse.json([], { status: 500 })),
    )
    const jsx = await Home()
    renderWithProviders(jsx)

    expect(screen.queryByRole('heading', { name: /produtos populares/i })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /mais vendidos/i })).toBeInTheDocument()
    expect(screen.getByText('Produto Mais Vendido')).toBeInTheDocument()
  })

  it('quando "mais vendidos" falha/retorna vazio, a seção some sem quebrar a de populares', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/catalog/products/best-selling', () => HttpResponse.json([], { status: 500 })),
    )
    const jsx = await Home()
    renderWithProviders(jsx)

    expect(screen.getByRole('heading', { name: /produtos populares/i })).toBeInTheDocument()
    expect(screen.getByText('Produto Popular')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /mais vendidos/i })).not.toBeInTheDocument()
  })

  it('renderiza os banners cadastrados junto das seções de produtos, sem quebrá-las', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/site/banners', () =>
        HttpResponse.json([
          makeBanner({ id: 'b1', imageUrl: 'https://cdn.example.com/b1.jpg' }),
          makeBanner({ id: 'b2', imageUrl: 'https://cdn.example.com/b2.jpg' }),
        ]),
      ),
    )
    const jsx = await Home()
    renderWithProviders(jsx)

    expect(screen.getAllByAltText('Banner promocional')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: /produtos populares/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /mais vendidos/i })).toBeInTheDocument()
  })

  it('quando "banners" retorna vazio ou erro, a home renderiza normalmente sem carrossel de banner', async () => {
    server.use(
      http.get('http://localhost:8080/api/v1/site/banners', () => HttpResponse.json([], { status: 500 })),
    )
    const jsx = await Home()
    renderWithProviders(jsx)

    expect(screen.queryByAltText('Banner promocional')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /produtos populares/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /mais vendidos/i })).toBeInTheDocument()
  })
})
