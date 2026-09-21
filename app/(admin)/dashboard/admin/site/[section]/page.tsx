import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteSectionContent } from '@/components/content/site/SiteSectionContent'
import { getSiteSection } from '@/lib/site-sections'

interface Props {
  params: Promise<{ section: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section } = await params
  return { title: getSiteSection(section)?.title ?? 'Site' }
}

export default async function SiteSectionPage({ params }: Props) {
  const { section } = await params
  if (!getSiteSection(section)) notFound()

  return <SiteSectionContent slug={section} backPath="/dashboard/admin/site" />
}
