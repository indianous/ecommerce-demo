import type { Metadata } from 'next'
import { DistributionCentersContent } from '@/components/content/dashboard/site/DistributionCentersContent'

export const metadata: Metadata = { title: 'Centros de distribuição' }

export default function DistributionCentersPage() {
  return <DistributionCentersContent />
}
