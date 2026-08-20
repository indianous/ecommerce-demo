import type { Metadata } from 'next'
import { AnalyticsContent } from '@/app/(employee)/dashboard/analytics/AnalyticsContent'

export const metadata: Metadata = { title: 'Analytics' }

export default function AdminAnalyticsPage() {
  return <AnalyticsContent />
}
