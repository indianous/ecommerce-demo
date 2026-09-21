import { describe, expect, it } from 'vitest'
import type { DashboardNavItem } from '../dashboard-nav-groups'
import { isNavItemActive } from '../dashboard-nav-active'

const items: DashboardNavItem[] = [
  { label: 'Produtos', href: '/dashboard/products', icon: 'Package' },
  { label: 'Excluídos', href: '/dashboard/products/deleted', icon: 'Trash2' },
  { label: 'Visão geral', href: '/dashboard/site', icon: 'Globe' },
  { label: 'Logo', href: '/dashboard/site/logo', icon: 'Image' },
  { label: 'Navegação', href: '/dashboard/site/navigation', icon: 'Menu' },
  { label: 'Ver site', href: '/', icon: 'ExternalLink', external: true },
]

const activeLabels = (pathname: string) =>
  items.filter((item) => isNavItemActive(pathname, item, items)).map((i) => i.label)

describe('isNavItemActive', () => {
  it('a página atual ativa só o próprio item, não o índice do site', () => {
    expect(activeLabels('/dashboard/site/logo')).toEqual(['Logo'])
    expect(activeLabels('/dashboard/site/navigation')).toEqual(['Navegação'])
  })

  it('o índice do site fica ativo só em /dashboard/site', () => {
    expect(activeLabels('/dashboard/site')).toEqual(['Visão geral'])
  })

  it('prefixo mais longo vence: /dashboard/products/deleted ativa só "Excluídos"', () => {
    expect(activeLabels('/dashboard/products/deleted')).toEqual(['Excluídos'])
  })

  it('subrotas ativam o item pai quando não há item mais específico', () => {
    expect(activeLabels('/dashboard/products/123/edit')).toEqual(['Produtos'])
  })

  it('não confunde prefixos de texto: /dashboard/products-x não ativa "Produtos"', () => {
    expect(activeLabels('/dashboard/products-x')).toEqual([])
  })

  it('item externo ("Ver site", href "/") nunca fica ativo', () => {
    expect(activeLabels('/')).toEqual([])
    expect(activeLabels('/dashboard/site')).not.toContain('Ver site')
  })
})
