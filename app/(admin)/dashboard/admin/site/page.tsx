import type { Metadata } from 'next'
import { SiteContent } from '@/components/content/dashboard/site/SiteContent'

export const metadata: Metadata = { title: 'Site' }

export default function AdminSitePage() {
  return <SiteContent basePath="/dashboard/admin/site" />
}
