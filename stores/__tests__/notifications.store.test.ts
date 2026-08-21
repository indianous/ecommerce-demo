import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { act } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotificationsStore } from '../notifications.store'
import { useAuthStore } from '../auth.store'
import type { AppNotification } from '@/types'

const notification: AppNotification = {
  id: 'n-1',
  type: 'ORDER_STATUS_CHANGED',
  title: 'Pedido atualizado',
  message: 'Seu pedido mudou de status',
  linkUrl: '/orders/1',
  readAt: null,
  createdAt: '2026-08-20T10:00:00Z',
}

let unreadCountCalls = 0

const server = setupServer(
  http.get('/api/notifications/unread-count', () => {
    unreadCountCalls++
    return HttpResponse.json({ count: 2 })
  }),
  http.get('/api/notifications', () => HttpResponse.json({ content: [notification], totalElements: 1 })),
  http.patch('/api/notifications/:id/read', () => new HttpResponse(null, { status: 204 })),
  http.patch('/api/notifications/read-all', () => new HttpResponse(null, { status: 204 })),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  unreadCountCalls = 0
  await act(async () => {
    useNotificationsStore.getState().stopPolling()
    useNotificationsStore.setState({ unreadCount: 0, items: [] })
    useAuthStore.setState({ accessToken: null, user: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'mock-token', isAuthenticated: true })
})

describe('notifications.store', () => {
  it('fetchUnreadCount(): atualiza o contador', async () => {
    await useNotificationsStore.getState().fetchUnreadCount()

    expect(useNotificationsStore.getState().unreadCount).toBe(2)
  })

  it('fetchList(): atualiza a lista de notificações', async () => {
    await useNotificationsStore.getState().fetchList()

    expect(useNotificationsStore.getState().items).toEqual([notification])
  })

  it('markAsRead(): atualiza otimisticamente e chama PATCH /api/notifications/{id}/read', async () => {
    useNotificationsStore.setState({ items: [notification], unreadCount: 1 })

    const promise = useNotificationsStore.getState().markAsRead('n-1')
    expect(useNotificationsStore.getState().items[0].readAt).not.toBeNull()
    expect(useNotificationsStore.getState().unreadCount).toBe(0)
    await promise
  })

  it('markAsRead(): reverte o estado local se a chamada falhar', async () => {
    server.use(http.patch('/api/notifications/:id/read', () => new HttpResponse(null, { status: 500 })))
    useNotificationsStore.setState({ items: [notification], unreadCount: 1 })

    await useNotificationsStore.getState().markAsRead('n-1')

    expect(useNotificationsStore.getState().items[0].readAt).toBeNull()
    expect(useNotificationsStore.getState().unreadCount).toBe(1)
  })

  it('markAllAsRead(): zera o contador e chama PATCH /api/notifications/read-all', async () => {
    useNotificationsStore.setState({ items: [notification], unreadCount: 1 })

    await useNotificationsStore.getState().markAllAsRead()

    expect(useNotificationsStore.getState().unreadCount).toBe(0)
    expect(useNotificationsStore.getState().items[0].readAt).not.toBeNull()
  })

  it('startPolling(): chama fetchUnreadCount a cada 60s enquanto autenticado', async () => {
    vi.useFakeTimers()
    try {
      useNotificationsStore.getState().startPolling()

      await vi.advanceTimersByTimeAsync(60_000)
      expect(unreadCountCalls).toBe(1)

      await vi.advanceTimersByTimeAsync(60_000)
      expect(unreadCountCalls).toBe(2)
    } finally {
      useNotificationsStore.getState().stopPolling()
      vi.useRealTimers()
    }
  })

  it('stopPolling(): para de chamar depois de parado (ex.: logout)', async () => {
    vi.useFakeTimers()
    try {
      useNotificationsStore.getState().startPolling()
      await vi.advanceTimersByTimeAsync(60_000)
      expect(unreadCountCalls).toBe(1)

      useNotificationsStore.getState().stopPolling()
      await vi.advanceTimersByTimeAsync(120_000)
      expect(unreadCountCalls).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })
})
