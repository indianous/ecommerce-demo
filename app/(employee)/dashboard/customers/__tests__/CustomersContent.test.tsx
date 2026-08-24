import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { CustomersContent } from '../CustomersContent'
import { useAuthStore } from '@/stores/auth.store'
import type { CustomerPage } from '@/types'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const mockPage: CustomerPage = {
  content: [
    { id: 'cust-2', name: 'Bruno Souza', email: 'bruno@test.com' },
    { id: 'cust-1', name: 'Ana Lima', email: 'ana@test.com' },
  ],
  page: 0,
  size: 50,
  totalElements: 2,
  totalPages: 1,
  last: true,
}

const server = setupServer(http.get('/api/admin/customers', () => HttpResponse.json(mockPage)))

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  pushMock.mockClear()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({
    isAuthenticated: true,
    accessToken: 'mock-token',
    role: 'EMPLOYEE' as const,
    user: {
      id: '1',
      name: 'Func',
      email: 'func@test.com',
      role: 'EMPLOYEE' as const,
      permissions: ['MANAGE_CUSTOMERS' as const],
    },
  })
})

function renderContent(basePath?: string) {
  return render(
    <ToastProvider>
      <CustomersContent basePath={basePath} />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('CustomersContent', () => {
  it('renderiza o heading e a tabela de clientes vinda da API', async () => {
    renderContent()
    expect(screen.getByRole('heading', { name: 'Gestão de Clientes' })).toBeInTheDocument()
    expect(await screen.findByRole('cell', { name: 'Bruno Souza' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Nome' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'E-mail' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'ana@test.com' })).toBeInTheDocument()
  })

  it('exibe botão de copiar ao lado do nome e do e-mail', async () => {
    renderContent()
    await screen.findByRole('cell', { name: 'Bruno Souza' })
    expect(screen.getAllByRole('button', { name: 'Copiar nome' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Copiar e-mail' }).length).toBeGreaterThan(0)
  })

  it('botão "Ver detalhe" navega para basePath/{id} (default)', async () => {
    renderContent()
    await screen.findByRole('cell', { name: 'Bruno Souza' })
    const rows = screen.getAllByRole('button', { name: 'Ver detalhe' })
    await userEvent.click(rows[0])
    expect(pushMock).toHaveBeenCalledWith('/dashboard/customers/cust-2')
  })

  it('botão "Ver detalhe" navega respeitando basePath customizado', async () => {
    renderContent('/dashboard/admin/customers')
    await screen.findByRole('cell', { name: 'Bruno Souza' })
    const rows = screen.getAllByRole('button', { name: 'Ver detalhe' })
    await userEvent.click(rows[0])
    expect(pushMock).toHaveBeenCalledWith('/dashboard/admin/customers/cust-2')
  })

  it('estado vazio mostra mensagem em português, não "No data"', async () => {
    server.use(
      http.get('/api/admin/customers', () =>
        HttpResponse.json({ content: [], page: 0, size: 50, totalElements: 0, totalPages: 0, last: true }),
      ),
    )
    renderContent()
    expect(await screen.findByText(/nenhum cliente/i)).toBeInTheDocument()
    expect(screen.queryByText('No data')).not.toBeInTheDocument()
  })

  it('clicar no cabeçalho "Nome" ordena as linhas (asc, depois desc)', async () => {
    renderContent()
    await screen.findByRole('cell', { name: 'Bruno Souza' })

    const header = screen.getByRole('columnheader', { name: 'Nome' })
    await userEvent.click(header.querySelector('button')!)

    let cells = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(cells[0]).toContain('Ana Lima')
    expect(cells[1]).toContain('Bruno Souza')

    await userEvent.click(header.querySelector('button')!)

    cells = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(cells[0]).toContain('Bruno Souza')
    expect(cells[1]).toContain('Ana Lima')
  })
})
