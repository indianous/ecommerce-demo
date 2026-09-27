'use client'

import { useEffect, useRef, useState } from 'react'
import { useToast } from '@indianous/base-ds'
import { authFetch } from '@/lib/authFetch'

const COOLDOWN_MS = 60_000

/** Reenvio do link de confirmação de e-mail, com espera de 60 s entre cliques. */
export function useResendVerification(email: string | undefined) {
  const { toast } = useToast()
  const [sending, setSending] = useState(false)
  const [coolingDown, setCoolingDown] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const resend = async () => {
    setSending(true)
    try {
      const res = await authFetch('/api/auth/verify-email/resend', { method: 'POST' })
      if (!res.ok) {
        toast({ variant: 'destructive', description: 'Não foi possível reenviar agora. Tente de novo em alguns minutos.' })
        return
      }
      toast({ variant: 'success', description: `Enviamos um novo link para ${email}` })
      setCoolingDown(true)
      timer.current = setTimeout(() => setCoolingDown(false), COOLDOWN_MS)
    } catch {
      toast({ variant: 'destructive', description: 'Erro de conexão. Tente novamente.' })
    } finally {
      setSending(false)
    }
  }

  return { resend, sending, disabled: sending || coolingDown }
}
