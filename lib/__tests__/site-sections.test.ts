import { describe, expect, it } from 'vitest'
import { DASHBOARD_NAV_GROUPS } from '@/components/layout/dashboard-nav-groups'
import type { SiteSettings } from '@/types'
import { SITE_SECTIONS, getSiteSection, siteNavItems } from '../site-sections'

const EXPECTED_SLUGS = [
  'logo',
  'placeholder-image',
  'favicon',
  'metadata',
  'banners',
  'about-us',
  'contact',
  'social-links',
  'privacy-policy',
  'terms',
  'refund-policy',
  'payment-gateway',
  'fiscal-company-data',
  'melhor-envio',
]

const emptySettings = {
  placeholderImageUrl: null, faviconUrl: null, logoUrl: null, siteTitle: null,
  defaultDescription: null, aboutUsContent: null, contactDescription: null,
  contactPhone: null, contactEmail: null, instagramUrl: null, tiktokUrl: null,
  facebookUrl: null, privacyPolicyContent: null, termsContent: null, refundPolicyContent: null,
  fiscalCompanyCnpj: null,
} as unknown as SiteSettings

describe('SITE_SECTIONS', () => {
  it('tem exatamente as 14 seções esperadas, com slugs únicos em kebab-case', () => {
    const slugs = SITE_SECTIONS.map((s) => s.slug)

    expect([...slugs].sort()).toEqual([...EXPECTED_SLUGS].sort())
    expect(new Set(slugs).size).toBe(slugs.length)
    slugs.forEach((slug) => expect(slug).toMatch(/^[a-z]+(-[a-z]+)*$/))
  })

  it('toda seção tem título, descrição, ícone e grupo do índice', () => {
    SITE_SECTIONS.forEach((s) => {
      expect(s.title).toBeTruthy()
      expect(s.description).toBeTruthy()
      expect(s.icon).toBeTruthy()
      expect(s.group).toBeTruthy()
    })
  })
})

describe('getSiteSection', () => {
  it('devolve a seção pelo slug', () => {
    expect(getSiteSection('logo')?.title).toBe('Logo da loja')
  })

  it('devolve undefined para slug desconhecido e para as páginas que já têm rota própria', () => {
    expect(getSiteSection('nao-existe')).toBeUndefined()
    expect(getSiteSection('navigation')).toBeUndefined()
    expect(getSiteSection('distribution-centers')).toBeUndefined()
  })
})

describe('isConfigured', () => {
  const bySlug = (slug: string) => getSiteSection(slug)!.isConfigured!

  it.each([
    ['logo', { logoUrl: 'https://cdn/logo.svg' }],
    ['placeholder-image', { placeholderImageUrl: 'https://cdn/p.jpg' }],
    ['favicon', { faviconUrl: 'https://cdn/f.ico' }],
    ['metadata', { siteTitle: 'Loja' }],
    ['about-us', { aboutUsContent: '# Sobre' }],
    ['contact', { contactEmail: 'a@b.com' }],
    ['contact', { contactPhone: '11999999999' }],
    ['social-links', { instagramUrl: 'https://instagram.com/x' }],
    ['privacy-policy', { privacyPolicyContent: 'texto' }],
    ['terms', { termsContent: 'texto' }],
    ['refund-policy', { refundPolicyContent: 'texto' }],
    ['fiscal-company-data', { fiscalCompanyCnpj: '11444777000161' }],
  ])('%s: true quando há valor', (slug, patch) => {
    expect(bySlug(slug)({ ...emptySettings, ...patch })).toBe(true)
  })

  it.each([
    'logo', 'placeholder-image', 'favicon', 'metadata', 'about-us', 'contact',
    'social-links', 'privacy-policy', 'terms', 'refund-policy', 'fiscal-company-data',
  ])('%s: false com null e com string vazia', (slug) => {
    expect(bySlug(slug)(emptySettings)).toBe(false)
    const blank = Object.fromEntries(Object.keys(emptySettings).map((k) => [k, ''])) as unknown as SiteSettings
    expect(bySlug(slug)(blank)).toBe(false)
  })

  it('banners, gateway e Melhor Envio não dependem de /api/site/settings', () => {
    ;['banners', 'payment-gateway', 'melhor-envio'].forEach((slug) => {
      expect(getSiteSection(slug)!.isConfigured).toBeUndefined()
    })
  })
})

describe('siteNavItems', () => {
  const items = siteNavItems('/dashboard/site')

  it('começa em "Visão geral" e lista as 16 páginas do site, na ordem', () => {
    expect(items[0]).toMatchObject({ label: 'Visão geral', href: '/dashboard/site' })
    expect(items.slice(1).map((i) => i.href)).toEqual([
      '/dashboard/site/logo',
      '/dashboard/site/placeholder-image',
      '/dashboard/site/favicon',
      '/dashboard/site/metadata',
      '/dashboard/site/banners',
      '/dashboard/site/about-us',
      '/dashboard/site/contact',
      '/dashboard/site/social-links',
      '/dashboard/site/privacy-policy',
      '/dashboard/site/terms',
      '/dashboard/site/refund-policy',
      '/dashboard/site/navigation',
      '/dashboard/site/distribution-centers',
      '/dashboard/site/payment-gateway',
      '/dashboard/site/fiscal-company-data',
      '/dashboard/site/melhor-envio',
    ])
  })

  it('usa o prefixo do painel admin quando pedido', () => {
    siteNavItems('/dashboard/admin/site').forEach((i) => expect(i.href).toMatch(/^\/dashboard\/admin\/site(\/|$)/))
  })

  it('todos os itens têm label e ícone, e os ícones são distintos (sidebar recolhida mostra só ícone)', () => {
    items.forEach((i) => {
      expect(i.label).toBeTruthy()
      expect(i.icon).toBeTruthy()
    })
    expect(new Set(items.map((i) => i.icon)).size).toBe(items.length)
  })

  it('todos os itens ficam no mesmo grupo SITE (um cabeçalho só no menu)', () => {
    expect(DASHBOARD_NAV_GROUPS.SITE).toBe('Site')
    items.forEach((i) => expect(i.group).toBe(DASHBOARD_NAV_GROUPS.SITE))
  })
})
