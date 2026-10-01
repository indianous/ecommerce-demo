/**
 * Formatação das entidades do data.json no formato de cada resposta do backend: tira os campos internos do
 * gerador (cor, dono do registro, ids de relacionamento) e escolhe a visão (lista, detalhe, cliente, painel).
 */
import type { Address, AdminOrderResponse, Employee, OrderResponse, Product, User } from '@/types'
import type { DemoAddress, DemoData, DemoOrder, DemoProduct, DemoUser } from '../generator/generate'

export function productOut(product: DemoProduct, data: DemoData, user: DemoUser | null = null): Product {
  const rest = omit(product, 'colorHex', 'colorName')
  if (!user) return rest
  return { ...rest, isWishlisted: data.wishlist.some((w) => w.userId === user.id && w.productId === product.id) }
}

export function userOut(user: DemoUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    phone: user.phone,
    birthDate: user.birthDate,
    gender: user.gender,
    cpf: user.cpf,
    emailVerified: user.emailVerified,
    mfaEnabled: user.mfaEnabled,
    mfaEnabledAt: user.mfaEnabledAt ?? null,
    recoveryCodesRemaining: user.recoveryCodesRemaining ?? 0,
  }
}

export function employeeOut(user: DemoUser): Employee {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE',
    permissions: user.permissions,
    passwordSet: user.passwordSet,
    emailVerified: user.emailVerified,
    mfaEnabled: user.mfaEnabled,
    primaryAdmin: user.primaryAdmin,
  }
}

export function addressOut(address: DemoAddress): Address {
  return omit(address, 'userId')
}

/** Pedido na visão do cliente (`OrderResponse`). */
export function customerOrderOut(order: DemoOrder): OrderResponse {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: order.totalAmount,
    discountAmount: order.discountAmount,
    couponCode: order.couponCode,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paymentId: order.paymentId,
    createdAt: order.createdAt,
    items: order.items,
    ...(order.paymentStatus === 'PENDING' && order.checkoutUrl ? { checkoutUrl: order.checkoutUrl } : {}),
    shippingCost: order.shippingCost,
    shippingCarrierName: order.shippingCarrierName,
    shippingServiceName: order.shippingServiceName,
    trackingCode: order.trackingCode,
    shippingLabelUrl: order.shippingLabelUrl,
    deliveryMethod: order.deliveryMethod,
    pickupLocation: order.pickupLocation,
    paymentProvider: order.paymentProvider,
    paymentExpiresAt: order.paymentExpiresAt ?? null,
  }
}

/** Pedido na listagem do painel (`AdminOrderResponse`): sem itens, endereço nem histórico. */
export function adminOrderOut(order: DemoOrder): AdminOrderResponse {
  return omit(
    order,
    'userId', 'checkoutUrl', 'paymentExpiresAt', 'items', 'address', 'statusHistory', 'invoice', 'paymentCheckoutUrl',
    'deliveryMethod', 'pickupLocation',
  )
}

/** Pedido no detalhe do painel (`AdminOrderDetailResponse`). */
export function adminOrderDetailOut(order: DemoOrder) {
  return omit(order, 'userId', 'checkoutUrl', 'paymentExpiresAt')
}

/** Remove uma chave de cada objeto (ex.: `productIds` da promoção, `userId` da notificação). */
export function omit<T extends object, K extends keyof T>(item: T, ...keys: K[]): Omit<T, K> {
  const copy = { ...item }
  for (const key of keys) delete copy[key]
  return copy
}
