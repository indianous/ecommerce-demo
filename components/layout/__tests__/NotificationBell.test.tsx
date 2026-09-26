import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

import { NotificationBell } from '../NotificationBell'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationsStore } from '@/stores/notifications.store'

const notification = {
  id: 'n-1',
  type: 'ORDER_STATUS_CHANGED',
  title: 'Pedido #42 atualizado',
  message: 'Seu pedido mudou de status',
  linkUrl: '/orders/42',
  readAt: null,
  createdAt: new Date().toISOString(),
}

let readCalls: string[] = []
let readAllCalled = false

const server = setupServer(
  http.get('/api/notifications/unread-count', () => HttpResponse.json({ count: 1 })),
  http.get('/api/notifications', () => HttpResponse.json({ content: [notification], totalElements: 1 })),
  http.patch('/api/notifications/:id/read', ({ params }) => {
    readCalls.push(params.id as string)
    return new HttpResponse(null, { status: 204 })
  }),
  http.patch('/api/notifications/read-all', () => {
    readAllCalled = true
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  readCalls = []
  readAllCalled = false
  pushMock.mockClear()
  await act(async () => {
    useNotificationsStore.getState().stopPolling()
    useNotificationsStore.setState({ unreadCount: 0, items: [] })
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

describe('NotificationBell', () => {
  it('usuário anônimo: não renderiza nada', () => {
    const { container } = render(<NotificationBell />)
    expect(container).toBeEmptyDOMElement()
  })

  it('com notificações não lidas, mostra o Badge com a contagem', async () => {
    useAuthStore.setState({ accessToken: 'tok', isAuthenticated: true })
    render(<NotificationBell />)

    expect(await screen.findByText('1')).toBeInTheDocument()
  })

  it('clique abre o Drawer com a lista', async () => {
    useAuthStore.setState({ accessToken: 'tok', isAuthenticated: true })
    const user = userEvent.setup()
    render(<NotificationBell />)

    await user.click(screen.getByRole('button', { name: /notificações/i }))

    expect(await screen.findByText('Pedido #42 atualizado')).toBeInTheDocument()
    expect(screen.getByText('Seu pedido mudou de status')).toBeInTheDocument()
  })

  it('clicar numa notificação marca como lida e navega pro linkUrl', async () => {
    useAuthStore.setState({ accessToken: 'tok', isAuthenticated: true })
    const user = userEvent.setup()
    render(<NotificationBell />)

    await user.click(screen.getByRole('button', { name: /notificações/i }))
    await user.click(await screen.findByText('Pedido #42 atualizado'))

    expect(readCalls).toContain('n-1')
    expect(pushMock).toHaveBeenCalledWith('/orders/42')
  })

  it('"Marcar todas como lidas" chama PATCH /api/notifications/read-all e zera o contador', async () => {
    useAuthStore.setState({ accessToken: 'tok', isAuthenticated: true })
    const user = userEvent.setup()
    render(<NotificationBell />)

    await user.click(screen.getByRole('button', { name: /notificações/i }))
    await screen.findByText('Pedido #42 atualizado')
    await user.click(screen.getByRole('button', { name: /marcar todas como lidas/i }))

    expect(readAllCalled).toBe(true)
    expect(useNotificationsStore.getState().unreadCount).toBe(0)
  })

  it('lista vazia mostra "Nenhuma notificação por enquanto."', async () => {
    server.use(http.get('/api/notifications', () => HttpResponse.json({ content: [], totalElements: 0 })))
    useAuthStore.setState({ accessToken: 'tok', isAuthenticated: true })
    const user = userEvent.setup()
    render(<NotificationBell />)

    await user.click(screen.getByRole('button', { name: /notificações/i }))

    expect(await screen.findByText('Nenhuma notificação por enquanto.')).toBeInTheDocument()
  })

  it.each([['ADMIN' as const], ['EMPLOYEE' as const]])('equipe (%s) na loja: não renderiza o sino', (role) => {
    useAuthStore.setState({ accessToken: 'tok', isAuthenticated: true, role })
    const { container } = render(<NotificationBell />)

    expect(container).toBeEmptyDOMElement()
  })
})
