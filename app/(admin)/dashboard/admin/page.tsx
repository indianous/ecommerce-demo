import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Painel' }

export default function AdminDashboardPage() {
  redirect('/dashboard/admin/orders')
}
