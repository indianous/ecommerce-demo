'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Heading, Image, Text, useToast } from '@indianous/base-ds'
import { authFetch } from '@/lib/authFetch'
import { useAuthStore } from '@/stores/auth.store'
import { PixKeyForm } from '@/components/forms/PixKeyForm'
import { PixQrCodeForm } from '@/components/forms/PixQrCodeForm'
import type { SiteSettings } from '@/types'
import { SiteSettingsSection } from './SiteSettingsSection'

function ManualPaymentEditor({ settings, backPath }: { settings: SiteSettings; backPath: string }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()

  const [savedPixKey, setSavedPixKey] = useState(settings.pixKey ?? '')
  const [pixKey, setPixKey] = useState(settings.pixKey ?? '')
  const [holderName, setHolderName] = useState(settings.pixKeyHolder ?? '')
  const [pixSaving, setPixSaving] = useState(false)

  const [qrCodeUrl, setQrCodeUrl] = useState(settings.pixQrCodeUrl)
  const [qrFile, setQrFile] = useState<File | null>(null)
  const [qrSaving, setQrSaving] = useState(false)

  const handleSavePixKey = async () => {
    if (!accessToken) return
    setPixSaving(true)
    try {
      const res = await authFetch('/api/site/settings/pix', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pixKey: pixKey.trim(), holderName }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ variant: 'destructive', description: data?.message ?? 'Erro ao salvar chave PIX.' })
        return
      }
      // o backend devolve a chave normalizada (ex.: CPF só com dígitos)
      setPixKey(data.pixKey ?? pixKey)
      setSavedPixKey(data.pixKey ?? pixKey)
      toast({ variant: 'success', description: 'Chave PIX atualizada com sucesso.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao salvar chave PIX.' })
    } finally {
      setPixSaving(false)
    }
  }

  const handleSaveQrCode = async () => {
    if (!qrFile || !accessToken) return
    setQrSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', qrFile)
      const res = await authFetch('/api/site/settings/pix-qr-code', { method: 'PUT', body: fd })
      const data = await res.json()
      if (!res.ok) {
        toast({ variant: 'destructive', description: data?.message ?? 'Erro ao salvar QR Code.' })
        return
      }
      setQrCodeUrl(data.pixQrCodeUrl)
      setQrFile(null)
      toast({ variant: 'success', description: 'QR Code atualizado com sucesso.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao salvar QR Code.' })
    } finally {
      setQrSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <Heading as="h2" size="xl" className="mb-2">Chave PIX</Heading>
        <p className="mb-4 text-sm text-muted-foreground">
          Chave que o cliente usa para pagar por PIX. Pagar na retirada não precisa de configuração.
        </p>
        {!savedPixKey.trim() && (
          <Text size="sm" className="mb-4">
            Sem chave PIX cadastrada, os clientes só conseguem pagar na retirada (e o checkout só oferece retirada).
          </Text>
        )}
        <PixKeyForm
          pixKey={pixKey}
          holderName={holderName}
          onPixKeyChange={setPixKey}
          onHolderNameChange={setHolderName}
          onSave={handleSavePixKey}
          saving={pixSaving}
          saveLabel="Salvar chave PIX"
        />
      </section>

      <section>
        <Heading as="h2" size="xl" className="mb-2">QR Code do PIX</Heading>
        <p className="mb-4 text-sm text-muted-foreground">
          Imagem do QR Code do seu banco, exibida ao cliente junto da chave. É um QR fixo, sem o valor do pedido.
        </p>
        {qrCodeUrl && (
          <Image src={qrCodeUrl} alt="QR Code atual" className="mb-4 max-w-[200px] rounded border" />
        )}
        <PixQrCodeForm
          file={qrFile}
          onFileChange={setQrFile}
          onSave={handleSaveQrCode}
          saving={qrSaving}
          saveLabel="Salvar QR Code"
        />
      </section>

      <section>
        <Heading as="h2" size="xl" className="mb-2">Envio do comprovante</Heading>
        <Text size="sm">
          O telefone de contato ({settings.contactPhone || 'não cadastrado'}) também será usado como WhatsApp para os
          clientes enviarem comprovantes de pagamento, e o e-mail de contato ({settings.contactEmail || 'não cadastrado'})
          também recebe comprovantes.{' '}
          <Link href={`${backPath}/contact`} className="underline">Alterar em Contato</Link>
        </Text>
      </section>
    </div>
  )
}

export function SiteManualPaymentContent({ backPath }: { backPath: string }) {
  return (
    <SiteSettingsSection slug="manual-payment" backPath={backPath}>
      {(settings) => <ManualPaymentEditor settings={settings} backPath={backPath} />}
    </SiteSettingsSection>
  )
}
