'use client'

import { useEffect, useState } from 'react'
import { Heading, Text } from 'base-ds'
import { CheckoutAuth } from '@/components/checkout/CheckoutAuth'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import { useAuthStore } from '@/stores/auth.store'
import type { Address } from '@/types'

export default function CheckoutPage() {
  const { accessToken } = useAuthStore()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    setLoading(true)
    fetch('/api/addresses', { headers: { Authorization: `Bearer ${accessToken}` } })
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
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <Text color="muted">Carregando...</Text>
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
