'use client'

import { useEffect } from 'react'

interface Props {
  productId: string
}

export function ProductViewTracker({ productId }: Props) {
  useEffect(() => {
    fetch(`/api/products/${productId}/views`, { method: 'POST' }).catch(() => {})
  }, [productId])

  return null
}
