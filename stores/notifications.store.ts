import { create } from 'zustand'
import { useAuthStore } from '@/stores/auth.store'
import type { AppNotification } from '@/types'

const POLL_INTERVAL_MS = 60_000

interface NotificationsState {
  unreadCount: number
  items: AppNotification[]
  fetchUnreadCount: () => Promise<void>
  fetchList: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  startPolling: () => void
  stopPolling: () => void
}

function authHeaders(): HeadersInit | undefined {
  const { accessToken } = useAuthStore.getState()
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
}

let pollingInterval: ReturnType<typeof setInterval> | null = null

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  unreadCount: 0,
  items: [],

  fetchUnreadCount: async () => {
    const headers = authHeaders()
    if (!headers) return
    const res = await fetch('/api/notifications/unread-count', { headers })
    if (res.ok) {
      const data = await res.json()
      set({ unreadCount: data.count })
    }
  },

  fetchList: async () => {
    const headers = authHeaders()
    if (!headers) return
    const res = await fetch('/api/notifications', { headers })
    if (res.ok) {
      const data = await res.json()
      set({ items: data.content })
    }
  },

  markAsRead: async (id) => {
    const headers = authHeaders()
    if (!headers) return
    const previousItems = get().items
    const previousCount = get().unreadCount
    const wasUnread = previousItems.some((n) => n.id === id && !n.readAt)

    set({
      items: previousItems.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      unreadCount: wasUnread ? Math.max(0, previousCount - 1) : previousCount,
    })

    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', headers })
      if (!res.ok) throw new Error('Erro ao marcar notificação como lida')
    } catch {
      set({ items: previousItems, unreadCount: previousCount })
    }
  },

  markAllAsRead: async () => {
    const headers = authHeaders()
    if (!headers) return
    const previousItems = get().items
    const previousCount = get().unreadCount

    set({
      items: previousItems.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
      unreadCount: 0,
    })

    try {
      const res = await fetch('/api/notifications/read-all', { method: 'PATCH', headers })
      if (!res.ok) throw new Error('Erro ao marcar notificações como lidas')
    } catch {
      set({ items: previousItems, unreadCount: previousCount })
    }
  },

  startPolling: () => {
    if (pollingInterval) return
    pollingInterval = setInterval(() => {
      get().fetchUnreadCount()
    }, POLL_INTERVAL_MS)
  },

  stopPolling: () => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
  },
}))
