'use client'

import { useState } from 'react'
import { Button, Dialog, Icon, Text, useToast } from 'base-ds'
import { authFetch } from '@/lib/authFetch'

interface Props {
  userId: string
  name: string
  mfaEnabled: boolean
  canReset: boolean
  /** Depois do reset, para a tela atualizar o estado do 2FA. */
  onReset: () => void
}

/** Perdeu o celular e os códigos: limpa o 2FA da conta e encerra as sessões dela, com confirmação. */
export function MfaResetButton({ userId, name, mfaEnabled, canReset, onReset }: Props) {
  const { toast } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending] = useState(false)

  if (!canReset || !mfaEnabled) return null

  const reset = async () => {
    setSending(true)
    try {
      const res = await authFetch(`/api/admin/users/${userId}/mfa/reset`, { method: 'POST' })
      if (res.ok) {
        toast({ variant: 'success', description: `Verificação em duas etapas de ${name} resetada` })
        setConfirmOpen(false)
        onReset()
      } else {
        const body = await res.json().catch(() => null)
        toast({ variant: 'destructive', description: body?.message ?? 'Não foi possível resetar.' })
      }
    } catch {
      toast({ variant: 'destructive', description: 'Erro de conexão. Tente novamente.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Button leftIcon={<Icon name="ShieldOff" size="sm" />} variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
        Resetar 2FA
      </Button>
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Resetar a verificação em duas etapas"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={sending}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => void reset()} isLoading={sending}>
              Resetar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-2">
          <Text>
            Use quando {name} perdeu o celular e os códigos de recuperação. As sessões abertas de {name} serão
            encerradas.
          </Text>
          <Text>No próximo login, será preciso configurar o app autenticador de novo.</Text>
        </div>
      </Dialog>
    </>
  )
}
