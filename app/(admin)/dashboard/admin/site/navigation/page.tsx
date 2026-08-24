import type { Metadata } from 'next'
import { NavigationContent } from '@/components/content/NavigationContent'

export const metadata: Metadata = { title: 'Navegação do site' }

export default function AdminNavigationPage() {
  return <NavigationContent backPath="/dashboard/admin/site" />
}
