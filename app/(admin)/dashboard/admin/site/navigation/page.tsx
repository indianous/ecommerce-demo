import type { Metadata } from 'next'
import { NavigationContent } from '@/app/(employee)/dashboard/site/navigation/NavigationContent'

export const metadata: Metadata = { title: 'Navegação do site' }

export default function AdminNavigationPage() {
  return <NavigationContent backPath="/dashboard/admin/site" />
}
