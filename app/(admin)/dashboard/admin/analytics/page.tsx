import type { Metadata } from 'next'
import { AnalyticsContent } from '@/components/content/AnalyticsContent'

export const metadata: Metadata = { title: 'Analytics' }

export default function AdminAnalyticsPage() {
  return <AnalyticsContent />
}
