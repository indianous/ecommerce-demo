import type { Metadata } from 'next'
import { AnalyticsContent } from './AnalyticsContent'

export const metadata: Metadata = { title: 'Analytics' }

export default function AnalyticsPage() {
  return <AnalyticsContent />
}
