'use client'

import { useState } from 'react'
import { Card, QrCode, Skeleton, Text } from '@indianous/base-ds'
import { MfaCodeForm } from '@/components/forms/MfaCodeForm'
import { CopyButton } from '@/components/ui/CopyButton'
import { AuthError } from '@/stores/auth.store'
import type { MfaSetupInfo } from '@/types'

interface Props {
  /** null enquanto o segredo está sendo gerado. */
  setup: MfaSetupInfo | null
  /**
   * Recebe o primeiro código do app novo. O pai decide o que vem depois (códigos de recuperação, ou pedir o
   * código do app atual na troca de celular); um erro lançado aqui aparece no painel.
   */
  onConfirm: (code: string) => Promise<void>
  /** Erro vindo do pai depois do onConfirm (ex.: o código do app novo expirou na troca de celular). */
  error?: string
}

/** "JBSWY3DP..." → "JBSW Y3DP ...": mais fácil de digitar no app quando não dá para ler o QR code. */
function groupSecret(secret: string) {
  return secret.match(/.{1,4}/g)?.join(' ') ?? secret
}

/** Configuração do app autenticador: QR code, chave para digitar e o primeiro código. */
export function MfaSetupPanel({ setup, onConfirm, error: externalError }: Props) {
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>()

  const handleSubmit = async (value: string) => {
    setSubmitting(true)
    setError(undefined)
    try {
      await onConfirm(value)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível confirmar o código')
      setAttemptsRemaining(err instanceof AuthError ? err.attemptsRemaining : undefined)
      setCode('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-col gap-2 list-decimal pl-5">
        <li>
          <Text>
            Instale um app autenticador no celular, como Google Authenticator, Microsoft Authenticator, Authy ou
            1Password.
          </Text>
        </li>
        <li>
          <Text>Leia o QR code com o app (ou digite a chave abaixo).</Text>
        </li>
        <li>
          <Text>Digite o código de 6 dígitos que o app mostrar.</Text>
        </li>
      </ol>

      {setup ? (
        <Card className="flex flex-col items-center gap-4 p-4">
          <QrCode value={setup.otpauthUri} size={192} />
          <div className="flex items-center gap-2">
            <Text className="font-mono tracking-wider break-all">{groupSecret(setup.secret)}</Text>
            <CopyButton value={setup.secret} label="chave" />
          </div>
        </Card>
      ) : (
        <div role="status" aria-label="Carregando QR code" className="flex flex-col items-center gap-4">
          <Skeleton variant="rect" width={192} height={192} />
          <Skeleton variant="line" width="60%" />
        </div>
      )}

      <MfaCodeForm
        mode="code"
        code={code}
        recoveryCode=""
        onCodeChange={setCode}
        onRecoveryCodeChange={() => {}}
        onSubmit={handleSubmit}
        submitting={submitting || !setup}
        error={error ?? externalError}
        attemptsRemaining={attemptsRemaining}
      />
    </div>
  )
}
