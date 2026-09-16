'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/authFetch'
import { Heading, Skeleton } from 'base-ds'
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
      <main className="mx-auto max-w-md px-4 py-8">
        <Heading as="h1" size="2xl" className="mb-6">
          Finalizar pedido
        </Heading>
        <CheckoutAuth />
      </main>
    )
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-xl px-4 py-8" role="status" aria-label="Carregando checkout">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="line" height={40} className="mb-2" />
        ))}
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <Heading as="h1" size="2xl" className="mb-6">
        Finalizar pedido
      </Heading>
      <CheckoutForm addresses={addresses} />
    </main>
  )
}
