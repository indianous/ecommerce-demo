import type { Metadata } from 'next'
import { AdminsContent } from './AdminsContent'

export const metadata: Metadata = { title: 'Administradores' }

export default function AdminsPage() {
  return <AdminsContent />
}
