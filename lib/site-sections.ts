import { DASHBOARD_NAV_GROUPS, type DashboardNavItem, type IconName } from '@/components/layout/dashboard-nav-groups'
import type { SiteSettings } from '@/types'

export type SiteSectionId =
  | 'logo' | 'placeholder-image' | 'favicon' | 'metadata' | 'banners'
  | 'about-us' | 'contact' | 'social-links' | 'privacy-policy' | 'terms' | 'refund-policy'
  | 'payment-gateway' | 'manual-payment' | 'fiscal-company-data' | 'melhor-envio'

/** Agrupamento dos cards no índice `/dashboard/site` (o menu lateral usa um grupo só: SITE). */
export const SITE_HUB_GROUPS = {
  IDENTIDADE: 'Identidade visual',
  CONTEUDO: 'Conteúdo institucional',
  LOJA: 'Loja',
  PAGAMENTO: 'Pagamento e integrações',
} as const

export type SiteHubGroup = (typeof SITE_HUB_GROUPS)[keyof typeof SITE_HUB_GROUPS]

interface SiteEntry {
  slug: string
  /** Título da página e do card. */
  title: string
  /** Rótulo curto no menu lateral. */
  navLabel: string
  description: string
  icon: IconName
  group: SiteHubGroup
  /** Só as seções cujo status sai de `/api/site/settings`. */
  isConfigured?: (settings: SiteSettings) => boolean
}

export interface SiteSection extends SiteEntry {
  slug: SiteSectionId
}

const filled = (v: string | null | undefined) => Boolean(v && v.trim())

export const SITE_SECTIONS: SiteSection[] = [
  {
    slug: 'logo', title: 'Logo da loja', navLabel: 'Logo', icon: 'Image', group: SITE_HUB_GROUPS.IDENTIDADE,
    description: 'SVG utilizado como logotipo da loja.',
    isConfigured: (s) => filled(s.logoUrl),
  },
  {
    slug: 'placeholder-image', title: 'Placeholder de produto', navLabel: 'Placeholder', icon: 'ImageOff', group: SITE_HUB_GROUPS.IDENTIDADE,
    description: 'Imagem exibida quando um produto não tem foto.',
    isConfigured: (s) => filled(s.placeholderImageUrl),
  },
  {
    slug: 'favicon', title: 'Favicon do site', navLabel: 'Favicon', icon: 'AppWindow', group: SITE_HUB_GROUPS.IDENTIDADE,
    description: 'Ícone exibido na aba do navegador.',
    isConfigured: (s) => filled(s.faviconUrl),
  },
  {
    slug: 'metadata', title: 'Metadados do site', navLabel: 'Metadados', icon: 'Search', group: SITE_HUB_GROUPS.IDENTIDADE,
    description: 'Nome da loja e descrição padrão para SEO.',
    isConfigured: (s) => filled(s.siteTitle),
  },
  {
    slug: 'banners', title: 'Banners', navLabel: 'Banners', icon: 'Images', group: SITE_HUB_GROUPS.IDENTIDADE,
    description: 'Imagens de destaque exibidas na home.',
  },
  {
    slug: 'about-us', title: 'Sobre nós', navLabel: 'Sobre nós', icon: 'Info', group: SITE_HUB_GROUPS.CONTEUDO,
    description: 'Conteúdo da página /about-us.',
    isConfigured: (s) => filled(s.aboutUsContent),
  },
  {
    slug: 'contact', title: 'Contato', navLabel: 'Contato', icon: 'Phone', group: SITE_HUB_GROUPS.CONTEUDO,
    description: 'Informações exibidas na página /contact.',
    isConfigured: (s) => filled(s.contactEmail) || filled(s.contactPhone),
  },
  {
    slug: 'social-links', title: 'Redes sociais', navLabel: 'Redes sociais', icon: 'Share2', group: SITE_HUB_GROUPS.CONTEUDO,
    description: 'Links de Instagram, TikTok e Facebook.',
    isConfigured: (s) => filled(s.instagramUrl) || filled(s.tiktokUrl) || filled(s.facebookUrl),
  },
  {
    slug: 'privacy-policy', title: 'Política de privacidade', navLabel: 'Privacidade', icon: 'ShieldCheck', group: SITE_HUB_GROUPS.CONTEUDO,
    description: 'Conteúdo da página /privacy-policy.',
    isConfigured: (s) => filled(s.privacyPolicyContent),
  },
  {
    slug: 'terms', title: 'Termos e condições', navLabel: 'Termos e condições', icon: 'ScrollText', group: SITE_HUB_GROUPS.CONTEUDO,
    description: 'Conteúdo da página /terms-and-conditions.',
    isConfigured: (s) => filled(s.termsContent),
  },
  {
    slug: 'refund-policy', title: 'Política de reembolso', navLabel: 'Reembolso', icon: 'Undo2', group: SITE_HUB_GROUPS.CONTEUDO,
    description: 'Conteúdo da página /refund-policy.',
    isConfigured: (s) => filled(s.refundPolicyContent),
  },
  {
    slug: 'payment-gateway', title: 'Gateway de pagamento', navLabel: 'Gateway de pagamento', icon: 'Wallet', group: SITE_HUB_GROUPS.PAGAMENTO,
    description: 'Gateway usado para processar pagamentos no checkout.',
  },
  {
    slug: 'manual-payment', title: 'Pagamento manual', navLabel: 'Pagamento manual', icon: 'QrCode', group: SITE_HUB_GROUPS.PAGAMENTO,
    description: 'Chave PIX e QR Code exibidos ao cliente no pagamento manual.',
    isConfigured: (s) => filled(s.pixKey),
  },
  {
    slug: 'fiscal-company-data', title: 'Dados fiscais da empresa', navLabel: 'Dados fiscais', icon: 'Building2', group: SITE_HUB_GROUPS.PAGAMENTO,
    description: 'CNPJ, razão social, IE, regime tributário e endereço fiscal usados na emissão de NF-e.',
    isConfigured: (s) => filled(s.fiscalCompanyCnpj),
  },
  {
    slug: 'melhor-envio', title: 'Melhor Envio', navLabel: 'Melhor Envio', icon: 'Plug', group: SITE_HUB_GROUPS.PAGAMENTO,
    description: 'Conexão da conta do Melhor Envio para cotar e comprar etiquetas de frete.',
  },
]

/** Páginas de gestão que já têm rota própria (`navigation/` e `distribution-centers/`). */
export const SITE_STANDALONE_PAGES: SiteEntry[] = [
  {
    slug: 'navigation', title: 'Navegação do site', navLabel: 'Navegação', icon: 'Menu', group: SITE_HUB_GROUPS.LOJA,
    description: 'Links e coleções exibidos na navbar e no footer do site.',
  },
  {
    slug: 'distribution-centers', title: 'Centros de distribuição', navLabel: 'Centros de distribuição', icon: 'Warehouse', group: SITE_HUB_GROUPS.LOJA,
    description: 'Pontos onde o cliente pode retirar o pedido em vez de receber em casa.',
  },
]

/** Título de uma seção conhecida (as páginas usam o mesmo texto do registro). */
export function siteSectionTitle(id: SiteSectionId): string {
  return SITE_SECTIONS.find((s) => s.slug === id)!.title
}

/** Só as seções servidas pela rota dinâmica `[section]`. */
export function getSiteSection(slug: string): SiteSection | undefined {
  return SITE_SECTIONS.find((s) => s.slug === slug)
}

// Ordem do menu = ordem dos grupos do índice; as páginas já existentes ficam junto de "Loja".
const NAV_ORDER: string[] = [
  'logo', 'placeholder-image', 'favicon', 'metadata', 'banners',
  'about-us', 'contact', 'social-links', 'privacy-policy', 'terms', 'refund-policy',
  'navigation', 'distribution-centers',
  'payment-gateway', 'manual-payment', 'fiscal-company-data', 'melhor-envio',
]

/** Itens do menu lateral: "Visão geral" + as 16 páginas do site, todos sob o grupo SITE. */
export function siteNavItems(basePath: string): DashboardNavItem[] {
  const all: SiteEntry[] = [...SITE_SECTIONS, ...SITE_STANDALONE_PAGES]
  return [
    { label: 'Visão geral', href: basePath, icon: 'Globe', group: DASHBOARD_NAV_GROUPS.SITE },
    ...NAV_ORDER.map((slug) => {
      const entry = all.find((e) => e.slug === slug)!
      return {
        label: entry.navLabel,
        href: `${basePath}/${slug}`,
        icon: entry.icon,
        group: DASHBOARD_NAV_GROUPS.SITE,
      }
    }),
  ]
}
