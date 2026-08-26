import { create } from 'zustand'
import { useAuthStore } from '@/stores/auth.store'
import { authFetch } from '@/lib/authFetch'
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

function hasToken(): boolean {
  return !!useAuthStore.getState().accessToken
}

let pollingInterval: ReturnType<typeof setInterval> | null = null

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  unreadCount: 0,
  items: [],

  fetchUnreadCount: async () => {
    if (!hasToken()) return
    const res = await authFetch('/api/notifications/unread-count')
    if (res.ok) {
      const data = await res.json()
      set({ unreadCount: data.count })
    }
  },

  fetchList: async () => {
    if (!hasToken()) return
    const res = await authFetch('/api/notifications')
    if (res.ok) {
      const data = await res.json()
      set({ items: data.content })
    }
  },

  markAsRead: async (id) => {
    if (!hasToken()) return
    const previousItems = get().items
    const previousCount = get().unreadCount
    const wasUnread = previousItems.some((n) => n.id === id && !n.readAt)

    set({
      items: previousItems.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      unreadCount: wasUnread ? Math.max(0, previousCount - 1) : previousCount,
    })

    try {
      const res = await authFetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      if (!res.ok) throw new Error('Erro ao marcar notificação como lida')
    } catch {
      set({ items: previousItems, unreadCount: previousCount })
    }
  },

  markAllAsRead: async () => {
    if (!hasToken()) return
    const previousItems = get().items
    const previousCount = get().unreadCount

    set({
      items: previousItems.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
      unreadCount: 0,
    })

    try {
      const res = await authFetch('/api/notifications/read-all', { method: 'PATCH' })
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
