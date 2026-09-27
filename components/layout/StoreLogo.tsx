'use client'

import Link from 'next/link'
import { Image } from '@indianous/base-ds'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'

/** Logo da loja com link para a home (texto "Loja" sem logo configurado). Usado pela loja e pelo login. */
export function StoreLogo() {
  const { logoUrl } = useSiteSettings()

  return (
    <Link href="/" className="flex items-center">
      {logoUrl ? (
        <Image src={logoUrl} alt="Logo da loja" aspectRatio="square" objectFit="contain" className="h-8 w-8" />
      ) : (
        <span className="text-lg font-semibold text-foreground">Loja</span>
      )}
    </Link>
  )
}
