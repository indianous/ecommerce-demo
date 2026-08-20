'use client'

import { useState } from 'react'
import { useToast } from 'base-ds'
import { IconButton } from '@/components/ui/IconButton'
import { useAuthStore } from '@/stores/auth.store'

interface Props {
  productId: string
  initialWishlisted: boolean
}

export function WishlistButton({ productId, initialWishlisted }: Props) {
  const { isAuthenticated, accessToken } = useAuthStore()
  const { toast } = useToast()
  const [isWishlisted, setIsWishlisted] = useState(initialWishlisted)
  const [isLoading, setIsLoading] = useState(false)

  if (!isAuthenticated) return null

  const toggle = async () => {
    const next = !isWishlisted
    setIsWishlisted(next)
    setIsLoading(true)
    try {
      const res = await fetch(`/api/wishlist/${productId}`, {
        method: next ? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
    } catch {
      setIsWishlisted(!next)
      toast({ variant: 'destructive', description: 'Erro ao atualizar favoritos.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <IconButton
      icon="Heart"
      label={isWishlisted ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      variant={isWishlisted ? 'danger' : 'ghost'}
      size="sm"
      aria-pressed={isWishlisted}
      isLoading={isLoading}
      onClick={toggle}
    />
  )
}
