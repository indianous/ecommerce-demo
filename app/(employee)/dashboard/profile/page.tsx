import type { Metadata } from 'next'
import { EmployeeProfileContent } from '@/components/content/dashboard/EmployeeProfileContent'

export const metadata: Metadata = { title: 'Meu perfil' }

export default function ProfilePage() {
  return <EmployeeProfileContent />
}
