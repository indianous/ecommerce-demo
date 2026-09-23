import type { Metadata } from 'next'
import { NavigationContent } from '@/components/content/dashboard/site/NavigationContent'

export const metadata: Metadata = { title: 'Navegação do site' }

export default function AdminNavigationPage() {
  return <NavigationContent backPath="/dashboard/admin/site" />
}
