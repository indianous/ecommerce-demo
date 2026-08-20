'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'

interface Props {
  productId: string
}

export function ProductViewTracker({ productId }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    fetch(`/api/products/${productId}/views`, {
      method: 'POST',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    }).catch(() => {})
  }, [productId, accessToken])

  return null
}
