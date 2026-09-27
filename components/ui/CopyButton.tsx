'use client'

import { useState } from 'react'
import { Button, Icon, useToast } from '@indianous/base-ds'

interface CopyButtonProps {
  value: string
  label: string
}

function fallbackCopy(value: string): boolean {
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    document.body.removeChild(textarea)
  }
}

async function copyToClipboard(value: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      // cai no fallback abaixo
    }
  }
  return fallbackCopy(value)
}

export function CopyButton({ value, label }: CopyButtonProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const handleClick = async () => {
    const ok = await copyToClipboard(value)
    if (ok) {
      setCopied(true)
      toast({ variant: 'success', description: 'Copiado!' })
      setTimeout(() => setCopied(false), 1500)
    } else {
      toast({ variant: 'destructive', description: 'Não foi possível copiar.' })
    }
  }

  return (
    <Button
      iconOnly
      leftIcon={<Icon name={copied ? 'Check' : 'Copy'} size="sm" />}
      aria-label={`Copiar ${label}`}
      variant="ghost"
      size="sm"
      onClick={handleClick}
    />
  )
}
