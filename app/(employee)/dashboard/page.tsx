'use client'
import Link from 'next/link'
import { Heading } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import type { EmployeePermission } from '@/types'

interface DashboardCard {
  label: string
  description: string
  href: string
  perms: EmployeePermission[]
}

const CARDS: DashboardCard[] = [
  {
    label: 'Pedidos',
    description: 'Gerencie pedidos e atualize status',
    href: '/dashboard/orders',
    perms: ['MANAGE_ORDERS', 'MANAGE_ORDER_STATUS_REQUESTS'],
  },
  {
    label: 'Envios',
    description: 'Pedidos confirmados aguardando envio',
    href: '/dashboard/shipping',
    perms: ['MANAGE_SHIPPING'],
  },
  {
    label: 'Solicitações',
    description: 'Aprove ou rejeite solicitações de retrocesso',
    href: '/dashboard/change-requests',
    perms: ['MANAGE_ORDER_STATUS_REQUESTS'],
  },
  {
    label: 'Produtos',
    description: 'Gerencie o catálogo de produtos',
    href: '/dashboard/products',
    perms: ['MANAGE_PRODUCTS', 'RESTORE_PRODUCTS'],
  },
  {
    label: 'Estoque',
    description: 'Atualize a quantidade em estoque dos produtos',
    href: '/dashboard/products',
    perms: ['MANAGE_STOCK'],
  },
  {
    label: 'Clientes',
    description: 'Consulte clientes e seus endereços',
    href: '/dashboard/customers',
    perms: ['MANAGE_CUSTOMERS'],
  },
  {
    label: 'Pagamentos',
    description: 'Visualize e gerencie pagamentos',
    href: '/dashboard/payments',
    perms: ['MANAGE_PAYMENTS'],
  },
  {
    label: 'Funcionários',
    description: 'Gerencie permissões da equipe',
    href: '/dashboard/employees',
    perms: ['MANAGE_EMPLOYEES'],
  },
]

export default function DashboardPage() {
  const { user } = useAuthStore()
  const permissions = user?.permissions ?? []

  const visibleCards = CARDS.filter((card) =>
    card.perms.some((p) => permissions.includes(p)),
  )

  return (
    <div>
      <Heading as="h1" size="2xl" className="mb-6">
        Bem-vindo{user?.name ? `, ${user.name}` : ''}
      </Heading>

      {visibleCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="block p-5 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <h2 className="font-semibold text-base mb-1">{card.label}</h2>
              <p className="text-sm text-muted-foreground">{card.description}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
