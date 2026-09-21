import Link from 'next/link'
import type { DashboardNavItem } from './dashboard-nav-groups'
import { isNavItemActive } from './dashboard-nav-active'

type DashboardNavRow =
  | { type: 'header'; group: string; key: string }
  | { type: 'item'; item: DashboardNavItem; key: string }

export function groupNavItems(items: DashboardNavItem[]): DashboardNavRow[] {
  const rows: DashboardNavRow[] = []
  let previousGroup: string | undefined

  items.forEach((item, index) => {
    if (item.group !== undefined && item.group !== previousGroup) {
      rows.push({ type: 'header', group: item.group, key: `group-${index}` })
    }
    rows.push({ type: 'item', item, key: item.href })
    previousGroup = item.group
  })

  return rows
}

interface DashboardMobileNavListProps {
  items: DashboardNavItem[]
  pathname: string
  onNavigate: () => void
}

export function DashboardMobileNavList({ items, pathname, onNavigate }: DashboardMobileNavListProps) {
  return (
    <nav aria-label="Navegação mobile">
      <ul className="flex flex-col gap-1">
        {groupNavItems(items).map((row) => {
          if (row.type === 'header') {
            return (
              <li key={row.key}>
                <span className="block px-3 pb-1 pt-3 text-xs font-semibold uppercase text-muted-foreground">
                  {row.group}
                </span>
              </li>
            )
          }

          const item = row.item
          return (
            <li key={row.key}>
              <Link
                href={item.href}
                aria-current={isNavItemActive(pathname, item, items) ? 'page' : undefined}
                className="block px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
                onClick={onNavigate}
                {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
