'use client'

import { usePathname } from 'next/navigation'
import { Button } from 'base-ds'
import { useSiteSettings } from '@/contexts/SiteSettingsContext'
import { whatsappUrl } from '@/lib/whatsapp'

/** Mesmo padrão dos ícones de rede social do AppShell: o lucide não tem ícones de marca. */
const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.21-3.58.94.96-3.49-.23-.36a9.42 9.42 0 0 1-1.44-5.03c0-5.21 4.24-9.45 9.46-9.45 2.53 0 4.9.99 6.69 2.78a9.4 9.4 0 0 1 2.77 6.69c0 5.21-4.24 9.45-9.45 9.45zm8.04-17.49A11.3 11.3 0 0 0 12.04.67C5.77.67.67 5.77.67 12.04c0 2 .52 3.96 1.52 5.68L.57 23.33l5.74-1.5a11.33 11.33 0 0 0 5.73 1.46h.01c6.27 0 11.37-5.1 11.37-11.37 0-3.04-1.18-5.89-3.34-8.04z" />
  </svg>
)

/** Rotas da loja onde o botão atrapalharia: no checkout ele cobriria o "Finalizar pedido" no celular. */
const HIDDEN_ON = ['/checkout']

/** Botão flutuante que abre a conversa com a loja no WhatsApp (telefone de Site → Contato). */
export function WhatsAppButton() {
  const pathname = usePathname()
  const { contactPhone } = useSiteSettings()
  const href = whatsappUrl(contactPhone)

  if (!href || HIDDEN_ON.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return null

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Button
        as="a"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        iconOnly
        size="lg"
        variant="primary"
        aria-label="Falar com a loja no WhatsApp"
        tooltipPosition="left"
        leftIcon={<WhatsAppIcon />}
        className="rounded-full shadow-lg"
      />
    </div>
  )
}
