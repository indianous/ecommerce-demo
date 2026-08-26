'use client'

import { useEffect, useState } from 'react'
import { Button, Card, Heading, Icon, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'

export function MelhorEnvioConnectionCard() {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  const fetchStatus = () => {
    if (!accessToken) return
    setLoading(true)
    fetch('/api/admin/site/melhor-envio', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setConnected(!!data?.connected))
      .catch(() => setConnected(false))
      .finally(() => setLoading(false))
  }

  useEffect(fetchStatus, [accessToken])

  const handleConnect = async () => {
    if (!accessToken) return
    setConnecting(true)
    try {
      const res = await fetch('/api/admin/site/melhor-envio/oauth/authorize-url', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (!res.ok || !data?.authorizeUrl) {
        toast({ variant: 'destructive', description: data?.message ?? 'Erro ao conectar com o Melhor Envio.' })
        return
      }
      window.location.href = data.authorizeUrl
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao conectar com o Melhor Envio.' })
    } finally {
      setConnecting(false)
    }
  }

  return (
    <Card variant="outlined" className="h-full">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <Heading as="h2" size="xl">Melhor Envio</Heading>
          {!loading && !connected && (
            <Button
              iconOnly
              leftIcon={<Icon name="Truck" size="sm" />}
              aria-label="Conectar Melhor Envio"
              variant="primary"
              size="sm"
              isLoading={connecting}
              onClick={handleConnect}
            />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Conta usada para cotar fretes no checkout e comprar etiquetas de envio.
        </p>
        {loading ? (
          <span className="text-xs text-muted-foreground">Carregando...</span>
        ) : (
          <span className="text-xs text-muted-foreground">{connected ? 'Conectado' : 'Não conectado'}</span>
        )}
      </div>
    </Card>
  )
}
