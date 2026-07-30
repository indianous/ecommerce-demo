export type UserRole = 'CUSTOMER' | 'EMPLOYEE' | 'ADMIN'

export type EmployeePermission =
  | 'MANAGE_PRODUCTS'
  | 'MANAGE_CUSTOMERS'
  | 'MANAGE_ORDERS'
  | 'MANAGE_STOCK'
  | 'MANAGE_SHIPPING'
  | 'MANAGE_PAYMENTS'
  | 'RESTORE_PRODUCTS'
  | 'MANAGE_EMPLOYEES'
  | 'MANAGE_ORDER_STATUS_REQUESTS'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  permissions: EmployeePermission[]
}

export interface Address {
  id: string
  street: string
  number: string
  complement?: string
  district: string
  city: string
  state: string
  zipCode: string
  isDefault: boolean
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
}

export interface Product {
  id: string
  categoryId: string
  categoryName: string
  name: string
  description?: string
  price: number
  stockQuantity: number
  imageUrl?: string
  active: boolean
}

export interface ProductPage {
  content: Product[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'BOLETO'
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'

export interface OrderItemResponse {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface OrderResponse {
  id: string
  orderNumber: number
  status: OrderStatus
  totalAmount: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  paymentId?: string
  createdAt: string
  items: OrderItemResponse[]
}

export interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  imageUrl?: string
}

export interface AdminOrderResponse {
  id: string
  orderNumber: number
  customerName: string
  customerEmail: string
  status: OrderStatus
  totalAmount: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  paymentId?: string
  createdAt: string
  itemCount: number
}

export interface ApiError {
  message: string
  status: number
}

export interface Employee {
  id: string
  name: string
  email: string
  role: 'EMPLOYEE'
  permissions: EmployeePermission[]
}

export interface EmployeeFormData {
  name: string
  email: string
  password: string
}

export type AuditEntityType = 'PRODUCT' | 'CATEGORY' | 'ORDER' | 'USER' | 'ADDRESS'
export type AuditAction =
  | 'CREATED'
  | 'UPDATED'
  | 'DELETED'
  | 'DEACTIVATED'
  | 'STATUS_UPDATED'
  | 'PASSWORD_CHANGED'

export interface AuditLogResponse {
  id: number
  entityType: AuditEntityType
  entityId: string
  action: AuditAction
  actorEmail: string | null
  actorRole: string | null
  createdAt: string
}

export interface AuditLogPage {
  content: AuditLogResponse[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}
