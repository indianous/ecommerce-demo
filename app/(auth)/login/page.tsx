import type { Metadata } from 'next'
import { LoginContent } from '@/components/content/auth/LoginContent'

export const metadata: Metadata = { title: 'Entrar' }

export default function LoginPage() {
  return <LoginContent />
}
