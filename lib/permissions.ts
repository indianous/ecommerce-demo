import type { EmployeePermission } from '@/types'

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
}

export const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as EmployeePermission[]
