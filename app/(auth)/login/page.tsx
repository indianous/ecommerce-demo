import type { Metadata } from 'next'
import { LoginContent } from './LoginContent'

export const metadata: Metadata = { title: 'Entrar' }

export default function LoginPage() {
  return <LoginContent />
}
