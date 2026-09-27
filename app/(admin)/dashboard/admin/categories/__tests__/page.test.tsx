import { act, render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}))

import { ToastProvider } from '@indianous/base-ds'
import AdminCategoriesPage, { metadata } from '../page'
import { useAuthStore } from '@/stores/auth.store'

const server = setupServer(
  http.get('/api/admin/categories', () =>
    HttpResponse.json([{ id: 'c-1', name: 'Roupas', slug: 'roupas', productCount: 1 }]),
  ),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

describe('AdminCategoriesPage', () => {
  it('admin vê a lista de categorias', async () => {
    useAuthStore.setState({
      accessToken: 'tok',
      isAuthenticated: true,
      role: 'ADMIN',
      user: {
        id: 'a-1', name: 'Admin', email: 'admin@test.com', role: 'ADMIN', permissions: [],
        phone: null, birthDate: null, gender: 'PREFIRO_NAO_DIZER' as const, cpf: null,
      },
    })

    render(
      <ToastProvider>
        <AdminCategoriesPage />
      </ToastProvider>,
    )

    expect(await screen.findByRole('heading', { name: 'Categorias' })).toBeInTheDocument()
    expect(await screen.findByText('Roupas')).toBeInTheDocument()
  })

  it('exporta o título da página', () => {
    expect(metadata.title).toBe('Categorias')
  })
})
