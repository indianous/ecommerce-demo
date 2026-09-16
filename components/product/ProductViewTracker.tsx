'use client'

import { useEffect } from 'react'
import { authFetch } from '@/lib/authFetch'
import { useAuthStore } from '@/stores/auth.store'

interface Props {
  productId: string
}

export function ProductViewTracker({ productId }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    authFetch(`/api/products/${productId}/views`, {
      method: 'POST',
      headers: accessToken ? { } : undefined,
    }).catch(() => {})
  }, [productId, accessToken])

  return null
}
