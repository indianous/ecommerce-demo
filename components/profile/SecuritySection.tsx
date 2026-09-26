'use client'

import { useState } from 'react'
import { Badge, Button, Dialog, Heading, Icon, Text, useToast } from 'base-ds'
import { MfaSetupPanel } from '@/components/auth/MfaSetupPanel'
import { RecoveryCodesPanel } from '@/components/auth/RecoveryCodesPanel'
import { MfaCodeForm } from '@/components/forms/MfaCodeForm'
import { MfaDisableForm } from '@/components/forms/MfaDisableForm'
import { authFetch } from '@/lib/authFetch'
import { useAuthStore } from '@/stores/auth.store'
import type { MfaSetupInfo, User } from '@/types'

/**
 * idle: estado atual. setup: QR code (ativar, ou app novo na troca de celular). currentCode: na troca de celular,
 * o código do app atual, pedido por último para não vencer enquanto a pessoa lê o QR code. regenerate: código do
 * app para gerar códigos novos. recoveryCodes: os códigos, mostrados uma vez.
 */
type View = 'idle' | 'setup' | 'currentCode' | 'regenerate' | 'recoveryCodes'

interface ApiError {
  message?: string
  code?: string
}

async function postMfa<T>(path: string, body?: unknown): Promise<T> {
  const res = await authFetch(`/api/auth/me/mfa/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({}))
    throw Object.assign(new Error(err.message ?? 'Não foi possível concluir. Tente de novo.'), { code: err.code })
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Não foi possível concluir. Tente de novo.'
}

function errorCode(err: unknown) {
  return (err as { code?: string } | null)?.code
}

/** Verificação em duas etapas da própria conta, nos três perfis. A equipe não pode desativar. */
export function SecuritySection() {
  const user = useAuthStore((s) => s.user)
  const { toast } = useToast()
  const [view, setView] = useState<View>('idle')
  const [setup, setSetup] = useState<MfaSetupInfo | null>(null)
  const [newCode, setNewCode] = useState('')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [disableOpen, setDisableOpen] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [disableError, setDisableError] = useState<string>()

  if (!user) return null
  const isStaff = user.role === 'ADMIN' || user.role === 'EMPLOYEE'
  const enabled = user.mfaEnabled === true

  const reset = () => {
    setView('idle')
    setSetup(null)
    setNewCode('')
    setCode('')
    setError(undefined)
  }

  const reloadUser = async () => {
    const res = await authFetch('/api/auth/me')
    if (res.ok) useAuthStore.getState().setUser((await res.json()) as User)
  }

  const startSetup = async () => {
    reset()
    setView('setup')
    try {
      setSetup(await postMfa<MfaSetupInfo>('setup/start'))
    } catch (err) {
      reset()
      toast({ variant: 'destructive', description: errorMessage(err) })
    }
  }

  const showRecoveryCodes = (codes: string[]) => {
    setRecoveryCodes(codes)
    setView('recoveryCodes')
  }

  /** Ativar: o código do app novo basta. Troca de celular: guarda e pede o do app atual em seguida. */
  const handleSetupConfirm = async (value: string) => {
    if (enabled) {
      setNewCode(value)
      setError(undefined)
      setCode('')
      setView('currentCode')
      return
    }
    const { recoveryCodes: codes } = await postMfa<{ recoveryCodes: string[] }>('setup/confirm', { code: value })
    showRecoveryCodes(codes)
  }

  const handleCurrentCode = async (currentCode: string) => {
    setSubmitting(true)
    setError(undefined)
    try {
      const { recoveryCodes: codes } = await postMfa<{ recoveryCodes: string[] }>('setup/confirm', {
        code: newCode,
        currentCode,
      })
      showRecoveryCodes(codes)
    } catch (err) {
      if (errorCode(err) === 'INVALID_CURRENT_MFA_CODE') {
        setError(errorMessage(err))
        setCode('')
      } else {
        // o código do app novo venceu enquanto a pessoa buscava o atual: volta ao QR code (o segredo novo continua)
        setView('setup')
        setError('O código do app novo expirou. Digite o código que aparece agora no app novo.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleRegenerate = async (value: string) => {
    setSubmitting(true)
    setError(undefined)
    try {
      const { recoveryCodes: codes } = await postMfa<{ recoveryCodes: string[] }>('recovery-codes', { code: value })
      showRecoveryCodes(codes)
    } catch (err) {
      setError(errorMessage(err))
      setCode('')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRecoveryCodesSaved = async () => {
    await reloadUser()
    reset()
  }

  const closeDisable = () => {
    setDisableOpen(false)
    setDisablePassword('')
    setDisableCode('')
    setDisableError(undefined)
  }

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setDisableError(undefined)
    try {
      await postMfa<void>('disable', { password: disablePassword, code: disableCode })
      closeDisable()
      toast({ variant: 'success', description: 'Verificação em duas etapas desativada' })
      await reloadUser()
    } catch (err) {
      setDisableError(errorMessage(err))
      setDisableCode('')
    } finally {
      setSubmitting(false)
    }
  }

  const cancelButton = (
    <Button type="button" variant="ghost" leftIcon={<Icon name="ArrowLeft" size="sm" />} onClick={reset} disabled={submitting}>
      Cancelar
    </Button>
  )

  return (
    <section className="flex flex-col gap-4">
      <Heading as="h2" size="xl">
        Verificação em duas etapas
      </Heading>

      {view === 'idle' && (
        <div className="flex flex-col gap-4 rounded-lg border border-border p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={enabled ? 'success' : 'default'}>{enabled ? 'Ativada' : 'Desativada'}</Badge>
            {isStaff && <Text size="sm" color="muted">Obrigatória para a equipe</Text>}
          </div>

          {enabled ? (
            <>
              <Text>
                Ativada desde {user.mfaEnabledAt ? new Date(user.mfaEnabledAt).toLocaleDateString('pt-BR') : '—'}.
                O login pede o código do app autenticador depois da senha.
              </Text>
              <Text size="sm" color="muted">
                Códigos de recuperação restantes: {user.recoveryCodesRemaining ?? 0}
              </Text>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" leftIcon={<Icon name="KeyRound" size="sm" />} onClick={() => { reset(); setView('regenerate') }}>
                  Gerar novos códigos
                </Button>
                <Button type="button" variant="outline" leftIcon={<Icon name="Smartphone" size="sm" />} onClick={startSetup}>
                  Trocar de celular
                </Button>
                {!isStaff && (
                  <Button type="button" variant="danger" leftIcon={<Icon name="ShieldOff" size="sm" />} onClick={() => setDisableOpen(true)}>
                    Desativar
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <Text>
                Com ela ativa, o login pede também um código de 6 dígitos do app autenticador no celular: quem
                descobrir a sua senha não consegue entrar.
              </Text>
              <div>
                <Button type="button" variant="primary" leftIcon={<Icon name="ShieldCheck" size="sm" />} onClick={startSetup}>
                  Ativar
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {view === 'setup' && (
        <div className="flex flex-col gap-4">
          {enabled && <Text>Leia o QR code com o app do celular novo. O app antigo para de valer quando você concluir.</Text>}
          <MfaSetupPanel setup={setup} onConfirm={handleSetupConfirm} error={error} />
          {cancelButton}
        </div>
      )}

      {view === 'currentCode' && (
        <div className="flex flex-col gap-4">
          <Text>Para confirmar a troca, digite o código do app atual (o do celular antigo).</Text>
          <MfaCodeForm
            mode="code"
            code={code}
            recoveryCode=""
            onCodeChange={setCode}
            onRecoveryCodeChange={() => {}}
            onSubmit={handleCurrentCode}
            submitting={submitting}
            error={error}
          />
          {cancelButton}
        </div>
      )}

      {view === 'regenerate' && (
        <div className="flex flex-col gap-4">
          <Text>Digite um código do app autenticador. Os códigos de recuperação atuais deixam de valer.</Text>
          <MfaCodeForm
            mode="code"
            code={code}
            recoveryCode=""
            onCodeChange={setCode}
            onRecoveryCodeChange={() => {}}
            onSubmit={handleRegenerate}
            submitting={submitting}
            error={error}
          />
          {cancelButton}
        </div>
      )}

      {view === 'recoveryCodes' && (
        <RecoveryCodesPanel codes={recoveryCodes} onContinue={handleRecoveryCodesSaved} continueLabel="Concluir" />
      )}

      <Dialog
        open={disableOpen}
        onClose={closeDisable}
        title="Desativar a verificação em duas etapas"
        description="Confirme com a sua senha e um código do app. Depois disso, o login volta a pedir só a senha."
      >
        <MfaDisableForm
          password={disablePassword}
          code={disableCode}
          onPasswordChange={setDisablePassword}
          onCodeChange={setDisableCode}
          onSubmit={handleDisable}
          onCancel={closeDisable}
          submitting={submitting}
          error={disableError}
        />
      </Dialog>
    </section>
  )
}
