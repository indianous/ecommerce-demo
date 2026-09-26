import type { Metadata } from 'next'
import { ResetPasswordContent } from '@/components/content/auth/ResetPasswordContent'

// Página com token na URL: sem Referer para recursos externos e fora dos buscadores.
export const metadata: Metadata = { title: 'Definir senha', referrer: 'no-referrer', robots: { index: false } }

export default function ResetPasswordPage() {
  return <ResetPasswordContent />
}
