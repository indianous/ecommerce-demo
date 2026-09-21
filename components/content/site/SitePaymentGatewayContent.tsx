'use client'
import { useEffect, useState } from 'react'
import { useToast } from 'base-ds'
import { authFetch } from '@/lib/authFetch'
import { siteSectionTitle } from '@/lib/site-sections'
import { useAuthStore } from '@/stores/auth.store'
import { PaymentGatewayForm } from '@/components/forms/PaymentGatewayForm'
import type { PaymentGatewayConfig, PaymentGatewayProvider } from '@/types'
import { SiteSectionPage } from './SiteSectionPage'

export function SitePaymentGatewayContent({ backPath }: { backPath: string }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [config, setConfig] = useState<PaymentGatewayConfig | null>(null)
  const [failed, setFailed] = useState(false)
  const [selected, setSelected] = useState<PaymentGatewayProvider>('MOCK')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return
    authFetch('/api/site/payment-gateway')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PaymentGatewayConfig | null) => {
        if (data) {
          setConfig(data)
          setSelected(data.active)
        } else {
          setFailed(true)
        }
      })
      .catch(() => setFailed(true))
  }, [accessToken])

  const handleSave = async () => {
    if (!accessToken) return
    setSaving(true)
    setError(null)
    try {
      const res = await authFetch('/api/site/payment-gateway', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selected }),
      })
      const data = await res.json()
      if (!res.ok) {
        const message = data?.message ?? 'Erro ao trocar gateway de pagamento.'
        setError(message)
        setSelected(config?.active ?? 'MOCK')
        toast({ variant: 'destructive', description: message })
        return
      }
      setConfig(data)
      setSelected(data.active)
      toast({ variant: 'success', description: 'Gateway de pagamento atualizado com sucesso.' })
    } catch {
      setError('Erro ao trocar gateway de pagamento.')
      setSelected(config?.active ?? 'MOCK')
      toast({ variant: 'destructive', description: 'Erro ao trocar gateway de pagamento.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <SiteSectionPage title={siteSectionTitle('payment-gateway')} backPath={backPath} loading={!config && !failed}>
      {config ? (
        <PaymentGatewayForm
          config={config}
          value={selected}
          onChange={setSelected}
          onSave={handleSave}
          saving={saving}
          error={error}
          saveLabel="Salvar gateway de pagamento"
        />
      ) : (
        <p className="text-sm text-muted-foreground">Não foi possível carregar o gateway de pagamento.</p>
      )}
    </SiteSectionPage>
  )
}
