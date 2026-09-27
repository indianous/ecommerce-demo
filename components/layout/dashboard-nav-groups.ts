import type { ComponentProps } from 'react'
import type { Icon } from '@indianous/base-ds'

export type IconName = ComponentProps<typeof Icon>['name']

export const DASHBOARD_NAV_GROUPS = {
  VENDAS: 'Vendas',
  CATALOGO: 'Catálogo',
  PESSOAS: 'Pessoas',
  SITE: 'Site',
  SISTEMA: 'Sistema',
} as const

export type DashboardNavGroup = (typeof DASHBOARD_NAV_GROUPS)[keyof typeof DASHBOARD_NAV_GROUPS]

export interface DashboardNavItem {
  label: string
  href: string
  icon: IconName
  group?: DashboardNavGroup
  external?: boolean
}
