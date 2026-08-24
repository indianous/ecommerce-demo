import type { Metadata } from 'next'
import { RegisterContent } from '@/components/content/RegisterContent'

export const metadata: Metadata = { title: 'Cadastro' }

export default function RegisterPage() {
  return <RegisterContent />
}
