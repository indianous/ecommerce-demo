import type { Metadata } from 'next'
import { ForgotPasswordContent } from '@/components/content/auth/ForgotPasswordContent'

// Recebe só o e-mail, mas o link de volta vem do mesmo fluxo: sem Referer e fora dos buscadores.
export const metadata: Metadata = { title: 'Esqueci minha senha', referrer: 'no-referrer', robots: { index: false } }

export default function ForgotPasswordPage() {
  return <ForgotPasswordContent />
}
