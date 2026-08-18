import { describe, expect, it } from 'vitest'
import { metadata as dashboardMetadata } from '../dashboard/page'
import { metadata as changeRequestsMetadata } from '../dashboard/change-requests/page'
import { metadata as customersMetadata } from '../dashboard/customers/page'
import { metadata as customerDetailMetadata } from '../dashboard/customers/[id]/page'
import { metadata as employeesMetadata } from '../dashboard/employees/page'
import { metadata as employeeDetailMetadata } from '../dashboard/employees/[id]/page'
import { metadata as ordersMetadata } from '../dashboard/orders/page'
import { metadata as orderDetailMetadata } from '../dashboard/orders/[id]/page'
import { metadata as paymentsMetadata } from '../dashboard/payments/page'
import { metadata as paymentConfirmMetadata } from '../dashboard/payments/[id]/confirm/page'
import { metadata as productsMetadata } from '../dashboard/products/page'
import { metadata as productNewMetadata } from '../dashboard/products/new/page'
import { metadata as productEditMetadata } from '../dashboard/products/[id]/edit/page'
import { metadata as productReviewsMetadata } from '../dashboard/products/[id]/reviews/page'
import { metadata as productsDeletedMetadata } from '../dashboard/products/deleted/page'
import { metadata as profileMetadata } from '../dashboard/profile/page'
import { metadata as shippingMetadata } from '../dashboard/shipping/page'
import { metadata as siteMetadata } from '../dashboard/site/page'
import { metadata as siteNavigationMetadata } from '../dashboard/site/navigation/page'
import { metadata as stockMetadata } from '../dashboard/stock/page'
import { metadata as stockDetailMetadata } from '../dashboard/stock/[id]/page'
import { metadata as stockExpiringMetadata } from '../dashboard/stock/expiring/page'

describe('(employee)/dashboard — metadata.title', () => {
  it.each([
    ['dashboard/page.tsx', dashboardMetadata, 'Painel'],
    ['dashboard/change-requests/page.tsx', changeRequestsMetadata, 'Solicitações'],
    ['dashboard/customers/page.tsx', customersMetadata, 'Clientes'],
    ['dashboard/customers/[id]/page.tsx', customerDetailMetadata, 'Detalhes do cliente'],
    ['dashboard/employees/page.tsx', employeesMetadata, 'Funcionários'],
    ['dashboard/employees/[id]/page.tsx', employeeDetailMetadata, 'Detalhes do funcionário'],
    ['dashboard/orders/page.tsx', ordersMetadata, 'Pedidos'],
    ['dashboard/orders/[id]/page.tsx', orderDetailMetadata, 'Detalhes do pedido'],
    ['dashboard/payments/page.tsx', paymentsMetadata, 'Pagamentos'],
    ['dashboard/payments/[id]/confirm/page.tsx', paymentConfirmMetadata, 'Confirmar pagamento'],
    ['dashboard/products/page.tsx', productsMetadata, 'Produtos'],
    ['dashboard/products/new/page.tsx', productNewMetadata, 'Novo produto'],
    ['dashboard/products/[id]/edit/page.tsx', productEditMetadata, 'Editar produto'],
    ['dashboard/products/[id]/reviews/page.tsx', productReviewsMetadata, 'Avaliações do produto'],
    ['dashboard/products/deleted/page.tsx', productsDeletedMetadata, 'Produtos excluídos'],
    ['dashboard/profile/page.tsx', profileMetadata, 'Meu perfil'],
    ['dashboard/shipping/page.tsx', shippingMetadata, 'Envios'],
    ['dashboard/site/page.tsx', siteMetadata, 'Site'],
    ['dashboard/site/navigation/page.tsx', siteNavigationMetadata, 'Navegação do site'],
    ['dashboard/stock/page.tsx', stockMetadata, 'Estoque'],
    ['dashboard/stock/[id]/page.tsx', stockDetailMetadata, 'Detalhes do estoque'],
    ['dashboard/stock/expiring/page.tsx', stockExpiringMetadata, 'Estoque a vencer'],
  ])('%s exporta title %s', (_name, metadata, expectedTitle) => {
    expect(metadata.title).toBe(expectedTitle)
  })
})
