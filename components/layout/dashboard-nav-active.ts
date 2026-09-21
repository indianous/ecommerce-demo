import type { DashboardNavItem } from './dashboard-nav-groups'

function matches(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Item ativo = o de href mais específico que casa com a rota. Sem isso, `/dashboard/site/logo`
 * ativaria também "Visão geral" (`/dashboard/site`), e `/dashboard/products/deleted` ativaria
 * "Produtos". Itens externos (ex.: "Ver site", href "/") nunca ficam ativos.
 */
export function isNavItemActive(
  pathname: string,
  item: DashboardNavItem,
  allItems: DashboardNavItem[],
): boolean {
  if (item.external || !matches(pathname, item.href)) return false
  return !allItems.some(
    (other) =>
      other !== item &&
      !other.external &&
      other.href.length > item.href.length &&
      matches(pathname, other.href),
  )
}
