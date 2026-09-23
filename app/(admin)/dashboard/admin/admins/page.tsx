import type { Metadata } from 'next'
import { AdminsContent } from '@/components/content/dashboard/people/AdminsContent'

export const metadata: Metadata = { title: 'Administradores' }

export default function AdminsPage() {
  return <AdminsContent />
}
