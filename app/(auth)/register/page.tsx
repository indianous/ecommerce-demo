import type { Metadata } from 'next'
import { RegisterContent } from '@/components/content/auth/RegisterContent'

export const metadata: Metadata = { title: 'Cadastro' }

export default function RegisterPage() {
  return <RegisterContent />
}
