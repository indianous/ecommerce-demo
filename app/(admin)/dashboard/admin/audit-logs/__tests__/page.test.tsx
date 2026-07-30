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
  http.get('/api/admin/audit-logs', () => HttpResponse.json(makePage([makeLog(), makeLog({ id: 2, entityType: 'PRODUCT', action: 'UPDATED' })]))),
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

  it('filtro por tipo de entidade chama GET com ?entityType=ORDER', async () => {
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

    const select = screen.getByLabelText(/tipo de entidade/i)
    await user.selectOptions(select, 'ORDER')

    await screen.findByText('uuid-order-1')
    expect(capturedUrl).toContain('entityType=ORDER')
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

    const select = screen.getByLabelText(/ação/i)
    await user.selectOptions(select, 'CREATED')

    await screen.findByText('uuid-order-1')
    expect(capturedUrl).toContain('action=CREATED')
  })
})
