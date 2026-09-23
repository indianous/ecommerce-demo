import type { Metadata } from 'next'
import { AdminProfileContent } from '@/components/content/dashboard/AdminProfileContent'

export const metadata: Metadata = { title: 'Meu perfil' }

export default function AdminProfilePage() {
  return <AdminProfileContent />
}
