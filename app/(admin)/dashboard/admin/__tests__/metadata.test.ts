import { describe, expect, it } from 'vitest'
import { metadata as dashboardMetadata } from '../page'
import { metadata as auditLogsMetadata } from '../audit-logs/page'
import { metadata as changeRequestsMetadata } from '../change-requests/page'
import { metadata as customersMetadata } from '../customers/page'
import { metadata as customerDetailMetadata } from '../customers/[id]/page'
import { metadata as employeesMetadata } from '../employees/page'
import { metadata as employeeDetailMetadata } from '../employees/[id]/page'
import { metadata as ordersMetadata } from '../orders/page'
import { metadata as orderDetailMetadata } from '../orders/[id]/page'
import { metadata as paymentsMetadata } from '../payments/page'
import { metadata as paymentConfirmMetadata } from '../payments/[id]/confirm/page'
import { metadata as productsMetadata } from '../products/page'
import { metadata as productNewMetadata } from '../products/new/page'
import { metadata as productEditMetadata } from '../products/[id]/edit/page'
import { metadata as productReviewsMetadata } from '../products/[id]/reviews/page'
import { metadata as productsDeletedMetadata } from '../products/deleted/page'
import { metadata as profileMetadata } from '../profile/page'
import { metadata as shippingMetadata } from '../shipping/page'
import { metadata as siteMetadata } from '../site/page'
import { metadata as siteNavigationMetadata } from '../site/navigation/page'
import { metadata as stockMetadata } from '../stock/page'
import { metadata as stockDetailMetadata } from '../stock/[id]/page'
import { metadata as stockExpiringMetadata } from '../stock/expiring/page'

describe('(admin)/dashboard/admin — metadata.title', () => {
  it.each([
    ['page.tsx', dashboardMetadata, 'Painel'],
    ['audit-logs/page.tsx', auditLogsMetadata, 'Auditoria'],
    ['change-requests/page.tsx', changeRequestsMetadata, 'Solicitações'],
    ['customers/page.tsx', customersMetadata, 'Clientes'],
    ['customers/[id]/page.tsx', customerDetailMetadata, 'Detalhes do cliente'],
    ['employees/page.tsx', employeesMetadata, 'Funcionários'],
    ['employees/[id]/page.tsx', employeeDetailMetadata, 'Detalhes do funcionário'],
    ['orders/page.tsx', ordersMetadata, 'Pedidos'],
    ['orders/[id]/page.tsx', orderDetailMetadata, 'Detalhes do pedido'],
    ['payments/page.tsx', paymentsMetadata, 'Pagamentos'],
    ['payments/[id]/confirm/page.tsx', paymentConfirmMetadata, 'Confirmar pagamento'],
    ['products/page.tsx', productsMetadata, 'Produtos'],
    ['products/new/page.tsx', productNewMetadata, 'Novo produto'],
    ['products/[id]/edit/page.tsx', productEditMetadata, 'Editar produto'],
    ['products/[id]/reviews/page.tsx', productReviewsMetadata, 'Avaliações do produto'],
    ['products/deleted/page.tsx', productsDeletedMetadata, 'Produtos excluídos'],
    ['profile/page.tsx', profileMetadata, 'Meu perfil'],
    ['shipping/page.tsx', shippingMetadata, 'Envios'],
    ['site/page.tsx', siteMetadata, 'Site'],
    ['site/navigation/page.tsx', siteNavigationMetadata, 'Navegação do site'],
    ['stock/page.tsx', stockMetadata, 'Estoque'],
    ['stock/[id]/page.tsx', stockDetailMetadata, 'Detalhes do estoque'],
    ['stock/expiring/page.tsx', stockExpiringMetadata, 'Estoque a vencer'],
  ])('%s exporta title %s', (_name, metadata, expectedTitle) => {
    expect(metadata.title).toBe(expectedTitle)
  })
})
