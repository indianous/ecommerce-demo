import type { Metadata } from 'next'
import { VerifyEmailContent } from '@/components/content/auth/VerifyEmailContent'

// Página com token na URL: sem Referer para recursos externos e fora dos buscadores.
export const metadata: Metadata = { title: 'Confirmar e-mail', referrer: 'no-referrer', robots: { index: false } }

export default function VerifyEmailPage() {
  return <VerifyEmailContent />
}
