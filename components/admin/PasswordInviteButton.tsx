'use client'

import { useState } from 'react'
import { Button, Dialog, Icon, Text, useToast } from '@indianous/base-ds'
import { authFetch } from '@/lib/authFetch'

interface Props {
  userId: string
  email: string
  /** false → convite para a primeira senha; true → link de redefinição. */
  passwordSet: boolean
  canInvite: boolean
}

/** Envia, com confirmação, o convite (conta sem senha) ou o link de redefinição de senha. */
export function PasswordInviteButton({ userId, email, passwordSet, canInvite }: Props) {
  const { toast } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending] = useState(false)

  if (!canInvite) return null

  const label = passwordSet ? 'Enviar link de redefinição' : 'Enviar convite'

  const send = async () => {
    setSending(true)
    try {
      const res = await authFetch(`/api/admin/users/${userId}/password-invite`, { method: 'POST' })
      if (res.ok) {
        toast({ variant: 'success', description: `Link enviado para ${email}` })
        setConfirmOpen(false)
      } else {
        const body = await res.json().catch(() => null)
        toast({ variant: 'destructive', description: body?.message ?? 'Não foi possível enviar o link.' })
      }
    } catch {
      toast({ variant: 'destructive', description: 'Erro de conexão. Tente novamente.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Button leftIcon={<Icon name="Mail" size="sm" />} variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
        {label}
      </Button>
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={label}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={sending}>Cancelar</Button>
            <Button variant="primary" onClick={() => void send()} isLoading={sending}>Enviar</Button>
          </div>
        }
      >
        <Text>
          {passwordSet
            ? `Enviar para ${email} um link para escolher uma nova senha? A senha atual continua valendo até o link ser usado.`
            : `Enviar para ${email} o convite para definir a senha e entrar na conta?`}
        </Text>
      </Dialog>
    </>
  )
}
