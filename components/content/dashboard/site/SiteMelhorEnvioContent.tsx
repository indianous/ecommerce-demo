'use client'
import { siteSectionTitle } from '@/lib/site-sections'
import { MelhorEnvioConnectionCard } from '@/components/admin/MelhorEnvioConnectionCard'
import { SiteSectionPage } from './SiteSectionPage'

export function SiteMelhorEnvioContent({ backPath }: { backPath: string }) {
  return (
    <SiteSectionPage title={siteSectionTitle('melhor-envio')} backPath={backPath}>
      <MelhorEnvioConnectionCard />
    </SiteSectionPage>
  )
}
