'use client'
import { useState } from 'react'
import { useToast } from '@indianous/base-ds'
import { authFetch } from '@/lib/authFetch'
import { useAuthStore } from '@/stores/auth.store'
import { ContactForm } from '@/components/forms/ContactForm'
import type { SiteSettings } from '@/types'
import { SiteSettingsSection } from './SiteSettingsSection'

function ContactEditor({ settings }: { settings: SiteSettings }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [description, setDescription] = useState(settings.contactDescription ?? '')
  const [phone, setPhone] = useState(settings.contactPhone ?? '')
  const [email, setEmail] = useState(settings.contactEmail ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!accessToken) return
    setSaving(true)
    try {
      const res = await authFetch('/api/site/settings/contact', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, phone, email }),
      })
      if (!res.ok) throw new Error()
      toast({ variant: 'success', description: 'Contato atualizado com sucesso.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao salvar contato.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ContactForm
      description={description} phone={phone} email={email}
      onDescription={setDescription} onPhone={setPhone} onEmail={setEmail}
      onSave={handleSave} saving={saving}
      saveLabel="Salvar contato"
    />
  )
}

export function SiteContactContent({ backPath }: { backPath: string }) {
  return (
    <SiteSettingsSection slug="contact" backPath={backPath}>
      {(settings) => <ContactEditor settings={settings} />}
    </SiteSettingsSection>
  )
}
