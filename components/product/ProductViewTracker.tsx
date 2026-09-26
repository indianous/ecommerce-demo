'use client'

import { useEffect } from 'react'
import { authFetch } from '@/lib/authFetch'
import { useStorefrontSession } from '@/stores/storefront-session'

interface Props {
  productId: string
}

export function ProductViewTracker({ productId }: Props) {
  const { accessToken } = useStorefrontSession()

  useEffect(() => {
    // equipe na loja conta como visitante: o authFetch anexaria o token dela
    const send = accessToken ? authFetch : fetch
    send(`/api/products/${productId}/views`, { method: 'POST' }).catch(() => {})
  }, [productId, accessToken])

  return null
}
