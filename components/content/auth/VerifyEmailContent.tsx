'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Container, Heading, Icon, Skeleton, Text } from 'base-ds'
import { useResendVerification } from '@/lib/useResendVerification'
import { useAuthStore } from '@/stores/auth.store'
import { useCartStore } from '@/stores/cart.store'

type State = 'loading' | 'verified' | 'expired' | 'invalid'

/** Aberta pelo link do e-mail. Não exige login: o link pode ser aberto em outro aparelho. */
export function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token] = useState(() => searchParams.get('token'))
  const [state, setState] = useState<State>(token ? 'loading' : 'invalid')
  // O StrictMode monta duas vezes: o link é de uso único, então a confirmação sai uma vez só.
  const requested = useRef(false)
  const routerRef = useRef(router)

  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const markEmailVerified = useAuthStore((s) => s.markEmailVerified)
  const hasCartItems = useCartStore((s) => s.items.length > 0)
  const { resend, sending, disabled } = useResendVerification(user?.email)

  useEffect(() => {
    if (!token || requested.current) return
    requested.current = true
    routerRef.current.replace('/verify-email')
    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        if (res.ok) {
          markEmailVerified()
          setState('verified')
        } else {
          setState(res.status === 410 ? 'expired' : 'invalid')
        }
      })
      .catch(() => setState('invalid'))
  }, [token, markEmailVerified])

  if (state === 'loading') {
    return (
      <Container width="sm" spacing="loose" role="status" aria-label="Confirmando e-mail">
        <Skeleton variant="line" height={40} />
      </Container>
    )
  }

  if (state === 'verified') {
    return (
      <Container width="sm" spacing="loose" className="flex flex-col gap-6">
        <Heading as="h1" size="2xl">E-mail confirmado</Heading>
        <Text color="muted">Tudo certo! Agora você já pode finalizar pedidos.</Text>
        <div className="flex flex-wrap gap-3">
          {isAuthenticated ? (
            <>
              <Button leftIcon={<Icon name="ShoppingBag" size="sm" />} as="a" href="/" variant="secondary">
                Continuar comprando
              </Button>
              {hasCartItems && (
                <Button leftIcon={<Icon name="ArrowRight" size="sm" />} as="a" href="/checkout" variant="primary">
                  Ir para o checkout
                </Button>
              )}
            </>
          ) : (
            <Button leftIcon={<Icon name="LogIn" size="sm" />} as="a" href="/login" variant="primary">
              Entrar
            </Button>
          )}
        </div>
      </Container>
    )
  }

  return (
    <Container width="sm" spacing="loose" className="flex flex-col gap-6">
      <Heading as="h1" size="2xl">
        {state === 'expired' ? 'Este link expirou ou já foi usado' : 'Link inválido'}
      </Heading>
      {isAuthenticated ? (
        <div>
          <Button
            leftIcon={<Icon name="Mail" size="sm" />}
            variant="primary"
            onClick={() => void resend()}
            disabled={disabled}
            isLoading={sending}
          >
            Enviar outro link
          </Button>
        </div>
      ) : (
        <div>
          <Button leftIcon={<Icon name="LogIn" size="sm" />} as="a" href="/login?callbackUrl=%2Fprofile" variant="primary">
            Entre para pedir outro link
          </Button>
        </div>
      )}
    </Container>
  )
}
