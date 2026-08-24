import type { Metadata } from 'next'
import { EmployeeProfileContent } from '@/components/content/EmployeeProfileContent'

export const metadata: Metadata = { title: 'Meu perfil' }

export default function ProfilePage() {
  return <EmployeeProfileContent />
}
