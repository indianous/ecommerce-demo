'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Button, Drawer, Icon, Text, Tooltip } from '@indianous/base-ds'
import { useStorefrontSession } from '@/stores/storefront-session'
import { useNotificationsStore } from '@/stores/notifications.store'
import { formatRelativeTime } from '@/lib/relative-time'
import type { AppNotification } from '@/types'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { isAuthenticated } = useStorefrontSession()
  const unreadCount = useNotificationsStore((s) => s.unreadCount)
  const items = useNotificationsStore((s) => s.items)
  const fetchUnreadCount = useNotificationsStore((s) => s.fetchUnreadCount)
  const fetchList = useNotificationsStore((s) => s.fetchList)
  const markAsRead = useNotificationsStore((s) => s.markAsRead)
  const markAllAsRead = useNotificationsStore((s) => s.markAllAsRead)
  const startPolling = useNotificationsStore((s) => s.startPolling)
  const stopPolling = useNotificationsStore((s) => s.stopPolling)

  useEffect(() => {
    if (!isAuthenticated) {
      stopPolling()
      return
    }
    fetchUnreadCount()
    startPolling()
    return () => stopPolling()
  }, [isAuthenticated, fetchUnreadCount, startPolling, stopPolling])

  if (!isAuthenticated) return null

  const handleOpen = () => {
    setOpen(true)
    fetchList()
  }

  const handleClickNotification = async (notification: AppNotification) => {
    await markAsRead(notification.id)
    if (notification.linkUrl) {
      setOpen(false)
      router.push(notification.linkUrl)
    }
  }

  return (
    <>
      <div className="relative inline-flex">
        <Tooltip label={`Notificações (${unreadCount})`} position="bottom">
          <Button iconOnly leftIcon={<Icon name="Bell" size="sm" />} variant="ghost" size="sm" onClick={handleOpen}>
            <span className="sr-only">{`Notificações (${unreadCount})`}</span>
          </Button>
        </Tooltip>
        {unreadCount > 0 && (
          <span aria-hidden="true" className="pointer-events-none absolute -right-1 -top-1">
            <Badge variant="primary" size="sm" className="!px-1.5 !py-0">
              {unreadCount}
            </Badge>
          </span>
        )}
      </div>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Notificações"
        side="right"
        footer={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => markAllAsRead()}
              className="rounded-md border border-border px-4 py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Marcar todas como lidas
            </button>
          ) : undefined
        }
      >
        {items.length === 0 ? (
          <Text color="muted">Nenhuma notificação por enquanto.</Text>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => handleClickNotification(notification)}
                  className="w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Text size="sm" weight="bold">{notification.title}</Text>
                    {!notification.readAt && (
                      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" aria-label="Não lida" />
                    )}
                  </div>
                  <Text size="sm" color="muted">{notification.message}</Text>
                  <Text size="xs" color="muted">{formatRelativeTime(notification.createdAt)}</Text>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Drawer>
    </>
  )
}
