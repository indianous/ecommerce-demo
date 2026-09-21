'use client'
import type { ComponentType } from 'react'
import type { SiteSectionId } from '@/lib/site-sections'
import { SiteAboutUsContent } from './SiteAboutUsContent'
import { SiteBannersContent } from './SiteBannersContent'
import { SiteContactContent } from './SiteContactContent'
import { SiteFaviconContent } from './SiteFaviconContent'
import { SiteFiscalCompanyDataContent } from './SiteFiscalCompanyDataContent'
import { SiteLogoContent } from './SiteLogoContent'
import { SiteMelhorEnvioContent } from './SiteMelhorEnvioContent'
import { SiteMetadataContent } from './SiteMetadataContent'
import { SitePaymentGatewayContent } from './SitePaymentGatewayContent'
import { SitePlaceholderContent } from './SitePlaceholderContent'
import { SitePrivacyPolicyContent } from './SitePrivacyPolicyContent'
import { SiteRefundPolicyContent } from './SiteRefundPolicyContent'
import { SiteSocialLinksContent } from './SiteSocialLinksContent'
import { SiteTermsContent } from './SiteTermsContent'

const SECTION_COMPONENTS: Record<SiteSectionId, ComponentType<{ backPath: string }>> = {
  'logo': SiteLogoContent,
  'placeholder-image': SitePlaceholderContent,
  'favicon': SiteFaviconContent,
  'metadata': SiteMetadataContent,
  'banners': SiteBannersContent,
  'about-us': SiteAboutUsContent,
  'contact': SiteContactContent,
  'social-links': SiteSocialLinksContent,
  'privacy-policy': SitePrivacyPolicyContent,
  'terms': SiteTermsContent,
  'refund-policy': SiteRefundPolicyContent,
  'payment-gateway': SitePaymentGatewayContent,
  'fiscal-company-data': SiteFiscalCompanyDataContent,
  'melhor-envio': SiteMelhorEnvioContent,
}

/** Resolve o slug da rota `/site/[section]` no componente da página. */
export function SiteSectionContent({ slug, backPath }: { slug: string; backPath: string }) {
  const Section = SECTION_COMPONENTS[slug as SiteSectionId]
  return Section ? <Section backPath={backPath} /> : null
}
