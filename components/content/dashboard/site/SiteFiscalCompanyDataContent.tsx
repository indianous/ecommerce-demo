'use client'
import { useState } from 'react'
import { useToast } from 'base-ds'
import { authFetch } from '@/lib/authFetch'
import { useAuthStore } from '@/stores/auth.store'
import { FiscalCompanyDataForm } from '@/components/forms/FiscalCompanyDataForm'
import type { FiscalCompanyData, SiteSettings } from '@/types'
import { SiteSettingsSection } from './SiteSettingsSection'

function fiscalDataFrom(settings: SiteSettings): FiscalCompanyData {
  return {
    cnpj: settings.fiscalCompanyCnpj ?? '',
    legalName: settings.fiscalCompanyLegalName ?? '',
    tradeName: settings.fiscalCompanyTradeName ?? '',
    stateRegistration: settings.fiscalCompanyStateRegistration ?? '',
    taxRegime: settings.fiscalCompanyTaxRegime ?? 'SIMPLES_NACIONAL',
    street: settings.fiscalCompanyStreet ?? '',
    number: settings.fiscalCompanyNumber ?? '',
    neighborhood: settings.fiscalCompanyNeighborhood ?? '',
    city: settings.fiscalCompanyCity ?? '',
    state: settings.fiscalCompanyState ?? '',
    zipCode: settings.fiscalCompanyZipCode ?? '',
    email: settings.fiscalCompanyEmail ?? '',
    phone: settings.fiscalCompanyPhone ?? '',
  }
}

function FiscalCompanyDataEditor({ settings }: { settings: SiteSettings }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [data, setData] = useState<FiscalCompanyData>(() => fiscalDataFrom(settings))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!accessToken) return
    setSaving(true)
    try {
      const res = await authFetch('/api/site/settings/fiscal-company-data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      toast({ variant: 'success', description: 'Dados fiscais da empresa atualizados com sucesso.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao salvar dados fiscais da empresa.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <FiscalCompanyDataForm
      data={data}
      onChange={(patch) => setData((d) => ({ ...d, ...patch }))}
      onSave={handleSave}
      saving={saving}
      saveLabel="Salvar dados fiscais da empresa"
    />
  )
}

export function SiteFiscalCompanyDataContent({ backPath }: { backPath: string }) {
  return (
    <SiteSettingsSection slug="fiscal-company-data" backPath={backPath}>
      {(settings) => <FiscalCompanyDataEditor settings={settings} />}
    </SiteSettingsSection>
  )
}
