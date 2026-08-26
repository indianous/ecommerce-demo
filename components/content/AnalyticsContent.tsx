'use client'

import { useCallback, useEffect, useState } from 'react'
import { authFetch } from '@/lib/authFetch'
import { FormField, Heading } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { FunnelChart } from '@/components/analytics/FunnelChart'
import { ChannelChart } from '@/components/analytics/ChannelChart'
import type { ChannelConversionResponse, FunnelResponse } from '@/types'

function defaultRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

export function AnalyticsContent() {
  const { accessToken } = useAuthStore()
  const [range, setRange] = useState(defaultRange)
  const [funnel, setFunnel] = useState<FunnelResponse | null>(null)
  const [channels, setChannels] = useState<ChannelConversionResponse[] | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ from: range.from, to: range.to })
      const [funnelRes, channelsRes] = await Promise.all([
        authFetch(`/api/admin/analytics/funnel?${params.toString()}`),
        authFetch(`/api/admin/analytics/channels?${params.toString()}`),
      ])
      if (funnelRes.ok) setFunnel(await funnelRes.json())
      if (channelsRes.ok) setChannels(await channelsRes.json())
    } finally {
      setLoading(false)
    }
  }, [accessToken, range.from, range.to])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <PermissionGuard permissions={['MANAGE_ANALYTICS']}>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Heading as="h1" size="2xl" className="mb-6">Analytics</Heading>

        <div className="flex gap-4 mb-6">
          <FormField label="De" id="analytics-from">
            <input
              id="analytics-from"
              type="date"
              value={range.from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </FormField>
          <FormField label="Até" id="analytics-to">
            <input
              id="analytics-to"
              type="date"
              value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </FormField>
        </div>

        <div style={{ opacity: loading ? 0.6 : 1 }}>
          <Heading as="h2" size="xl" className="mb-3">Funil de conversão</Heading>
          {funnel && <FunnelChart data={funnel} />}

          <Heading as="h2" size="xl" className="mb-3 mt-8">Conversão por canal</Heading>
          {channels && <ChannelChart data={channels} />}
        </div>
      </main>
    </PermissionGuard>
  )
}
