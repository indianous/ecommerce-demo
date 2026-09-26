import type { EmployeePermission, UserRole } from '@/types'

export const PERMISSION_LABELS: Record<EmployeePermission, string> = {
  MANAGE_PRODUCTS: 'Gerenciamento de Produtos',
  MANAGE_CUSTOMERS: 'Gestão de Clientes',
  MANAGE_ORDERS: 'Gerenciamento de Pedidos',
  MANAGE_STOCK: 'Gestão de Estoque',
  MANAGE_SHIPPING: 'Gestão de Envios',
  MANAGE_PAYMENTS: 'Gestão de Pagamento',
  RESTORE_PRODUCTS: 'Restaurar Produtos Excluídos',
  MANAGE_EMPLOYEES: 'Gestão de Funcionários',
  MANAGE_ORDER_STATUS_REQUESTS: 'Solicitações de Status de Pedidos',
  MANAGE_SITE: 'Gestão do Site',
  MANAGE_ANALYTICS: 'Analytics',
  MANAGE_COUPONS: 'Gestão de Cupons',
  CREATE_ORDERS: 'Criar pedidos',
}

export const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as EmployeePermission[]

type InviteActor = { role: UserRole; permissions: EmployeePermission[] } | null

/**
 * Quem pode mandar o convite/link de senha, pela mesma regra do backend: admin para qualquer um;
 * cliente exige MANAGE_CUSTOMERS; funcionário exige MANAGE_EMPLOYEES; admin só por admin.
 */
export function canSendPasswordInvite(actor: InviteActor, targetRole: UserRole): boolean {
  if (!actor) return false
  if (actor.role === 'ADMIN') return true
  if (actor.role !== 'EMPLOYEE') return false
  if (targetRole === 'CUSTOMER') return actor.permissions.includes('MANAGE_CUSTOMERS')
  if (targetRole === 'EMPLOYEE') return actor.permissions.includes('MANAGE_EMPLOYEES')
  return false
}

type ResetActor = { id: string; role: UserRole; permissions: EmployeePermission[] } | null

/**
 * Quem pode resetar o 2FA de alguém, pela mesma regra do backend: admin para qualquer um menos a si mesmo;
 * cliente também por quem tem MANAGE_CUSTOMERS. A equipe só é resetada por admin.
 */
export function canResetMfa(actor: ResetActor, target: { id: string; role: UserRole }): boolean {
  if (!actor || actor.id === target.id) return false
  if (actor.role === 'ADMIN') return true
  return actor.role === 'EMPLOYEE' && target.role === 'CUSTOMER' && actor.permissions.includes('MANAGE_CUSTOMERS')
}
