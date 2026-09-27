'use client'

import { useState } from 'react'
import { authFetch } from '@/lib/authFetch'
import { Button, Icon, useToast } from '@indianous/base-ds'
import { useStorefrontSession } from '@/stores/storefront-session'

interface Props {
  productId: string
  initialWishlisted: boolean
}

export function WishlistButton({ productId, initialWishlisted }: Props) {
  const { isAuthenticated } = useStorefrontSession()
  const { toast } = useToast()
  const [isWishlisted, setIsWishlisted] = useState(initialWishlisted)
  const [isLoading, setIsLoading] = useState(false)

  if (!isAuthenticated) return null

  const toggle = async () => {
    const next = !isWishlisted
    setIsWishlisted(next)
    setIsLoading(true)
    try {
      const res = await authFetch(`/api/wishlist/${productId}`, {
        method: next ? 'POST' : 'DELETE',
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
    <Button iconOnly leftIcon={<Icon name="Heart" size="sm" />} aria-label={isWishlisted ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} variant={isWishlisted ? 'danger' : 'ghost'} size="sm" aria-pressed={isWishlisted} isLoading={isLoading} onClick={toggle} />
  )
}
