import type { Metadata } from 'next'
import { AnalyticsContent } from '@/components/content/dashboard/system/AnalyticsContent'

export const metadata: Metadata = { title: 'Analytics' }

export default function AdminAnalyticsPage() {
  return <AnalyticsContent />
}
