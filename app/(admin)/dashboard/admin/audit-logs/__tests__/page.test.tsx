import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import AuditLogsPage from '../page'
import { useAuthStore } from '@/stores/auth.store'
import type { AuditLogPage, AuditLogResponse } from '@/types'

const makeLog = (overrides: Partial<AuditLogResponse> = {}): AuditLogResponse => ({
  id: 1,
  entityType: 'ORDER',
  entityId: 'uuid-order-1',
  action: 'CREATED',
  actorEmail: 'employee@test.com',
  actorRole: 'EMPLOYEE',
  createdAt: '2026-07-30T10:00:00',
  ...overrides,
})

const makePage = (content: AuditLogResponse[]): AuditLogPage => ({
  content,
  totalElements: content.length,
  totalPages: 1,
  size: 20,
  number: 0,
})

const server = setupServer(
  http.get('/api/admin/audit-logs', () =>
    HttpResponse.json(
      makePage([
        makeLog(),
        makeLog({ id: 2, entityType: 'PRODUCT', action: 'UPDATED', entityId: 'uuid-product-2', actorEmail: 'admin@test.com' }),
      ]),
    ),
  ),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'mock-token', isAuthenticated: true })
})

function renderPage() {
  return render(
    <ToastProvider>
      <AuditLogsPage />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('AuditLogsPage — Histórico de Auditoria', () => {
  it('exibe heading "Auditoria"', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: /auditoria/i })).toBeInTheDocument()
  })

  it('exibe logs retornados pela API na tabela', async () => {
    renderPage()
    expect(await screen.findByText('uuid-order-1')).toBeInTheDocument()
    expect(screen.getByText('employee@test.com')).toBeInTheDocument()
  })

  it('exibe estado vazio quando não há logs', async () => {
    server.use(http.get('/api/admin/audit-logs', () => HttpResponse.json(makePage([]))))
    renderPage()
    expect(await screen.findByText(/nenhum log encontrado/i)).toBeInTheDocument()
  })

  it('filtro por tipo de entidade: marcar 2 valores e "Aplicar" chama GET com os dois entityType', async () => {
    let capturedUrl = ''
    server.use(
      http.get('/api/admin/audit-logs', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json(makePage([makeLog()]))
      }),
    )
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('uuid-order-1')

    await user.click(screen.getByRole('button', { name: /tipo de entidade/i }))
    await user.click(screen.getByRole('checkbox', { name: 'Pedido' }))
    await user.click(screen.getByRole('checkbox', { name: 'Produto' }))
    await user.click(screen.getByRole('button', { name: /aplicar/i }))

    await screen.findByText('uuid-order-1')
    const params = new URL(capturedUrl).searchParams.getAll('entityType')
    expect(params).toEqual(['ORDER', 'PRODUCT'])
  })

  it('filtro por ação chama GET com ?action=CREATED', async () => {
    let capturedUrl = ''
    server.use(
      http.get('/api/admin/audit-logs', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json(makePage([makeLog()]))
      }),
    )
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('uuid-order-1')

    const actionFilterButton = screen.getAllByRole('button', { name: /^ação/i }).find((btn) => !btn.closest('table'))!
    await user.click(actionFilterButton)
    await user.click(screen.getByRole('checkbox', { name: 'Criação' }))
    await user.click(screen.getByRole('button', { name: /aplicar/i }))

    await screen.findByText('uuid-order-1')
    expect(capturedUrl).toContain('action=CREATED')
  })

  it('marcar uma opção do filtro de tipo sem clicar "Aplicar" não dispara nova chamada', async () => {
    let callCount = 0
    server.use(
      http.get('/api/admin/audit-logs', () => {
        callCount += 1
        return HttpResponse.json(makePage([makeLog()]))
      }),
    )
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('uuid-order-1')
    const callsBeforeFilter = callCount

    await user.click(screen.getByRole('button', { name: /tipo de entidade/i }))
    await user.click(screen.getByRole('checkbox', { name: 'Pedido' }))

    expect(callCount).toBe(callsBeforeFilter)
  })

  it('clicar no cabeçalho "Tipo" ordena as linhas (asc, depois desc)', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('uuid-order-1')

    const header = screen.getByRole('columnheader', { name: 'Tipo' })
    await user.click(header.querySelector('button')!)

    let rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('Pedido')
    expect(rows[1]).toContain('Produto')

    await user.click(header.querySelector('button')!)

    rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('Produto')
    expect(rows[1]).toContain('Pedido')
  })

  it.each(['Ação', 'Ator', 'Data'])('cabeçalho "%s" é ordenável', async (headerName) => {
    renderPage()
    await screen.findByText('uuid-order-1')
    const header = screen.getByRole('columnheader', { name: headerName })
    expect(header.querySelector('button')).toBeInTheDocument()
  })

  it('cabeçalho "ID da Entidade" não é ordenável', async () => {
    renderPage()
    await screen.findByText('uuid-order-1')
    const header = screen.getByRole('columnheader', { name: 'ID da Entidade' })
    expect(header.querySelector('button')).not.toBeInTheDocument()
  })
})
