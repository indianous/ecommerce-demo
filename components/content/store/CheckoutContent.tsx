'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/authFetch'
import { Container, Heading, Skeleton } from 'base-ds'
import { CheckoutAuth } from '@/components/forms/CheckoutAuth'
import { CheckoutForm } from '@/components/forms/CheckoutForm'
import { useAuthStore } from '@/stores/auth.store'
import type { Address } from '@/types'

export function CheckoutContent() {
  const { accessToken } = useAuthStore()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    setLoading(true)
    authFetch('/api/addresses')
      .then((res) => (res.ok ? res.json() : []))
      .then(setAddresses)
      .finally(() => setLoading(false))
  }, [accessToken])

  if (!accessToken) {
    return (
      <Container width="md">
        <Heading as="h1" size="2xl" className="mb-6">
          Finalizar pedido
        </Heading>
        <CheckoutAuth />
      </Container>
    )
  }

  if (loading) {
    return (
      <Container width="xl" role="status" aria-label="Carregando checkout">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="line" height={40} className="mb-2" />
        ))}
      </Container>
    )
  }

  return (
    <Container width="xl">
      <Heading as="h1" size="2xl" className="mb-6">
        Finalizar pedido
      </Heading>
      <CheckoutForm addresses={addresses} />
    </Container>
  )
}
