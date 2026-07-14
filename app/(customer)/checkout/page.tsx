'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heading, Text } from 'base-ds'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import { useAuthStore } from '@/stores/auth.store'
import type { Address } from '@/types'

export default function CheckoutPage() {
  const { accessToken } = useAuthStore()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(() => Boolean(accessToken))

  useEffect(() => {
    if (!accessToken) return
    fetch('/api/addresses', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then(setAddresses)
      .finally(() => setLoading(false))
  }, [accessToken])

  if (!accessToken) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <Heading as="h1" size="2xl" className="mb-4">
          Finalizar pedido
        </Heading>
        <Text color="muted" className="mb-6">
          Você precisa entrar na sua conta para finalizar o pedido.
        </Text>
        <Link href="/login" className="text-primary hover:underline">
          Entrar
        </Link>
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
