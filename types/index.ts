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
  | 'MANAGE_SITE'

export interface SiteSettings {
  placeholderImageUrl: string | null
  faviconUrl: string | null
  logoUrl: string | null
  siteTitle: string | null
  defaultDescription: string | null
  aboutUsContent: string | null
  contactDescription: string | null
  contactPhone: string | null
  contactEmail: string | null
  instagramUrl: string | null
  tiktokUrl: string | null
  facebookUrl: string | null
  privacyPolicyContent: string | null
  termsContent: string | null
  refundPolicyContent: string | null
}

export type PaymentGatewayProvider = 'MOCK' | 'STRIPE' | 'PAGSEGURO'

export interface PaymentGatewayOption {
  provider: PaymentGatewayProvider
  configured: boolean
}

export interface PaymentGatewayConfig {
  active: PaymentGatewayProvider
  available: PaymentGatewayOption[]
}

export interface Banner {
  id: string
  imageUrl: string
  linkUrl: string | null
  position: number
}

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

export type ProductStatus = 'AVAILABLE' | 'UNAVAILABLE'

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
  status: ProductStatus
  createdAt: string
  updatedAt: string
  averageRating?: number
  reviewCount?: number
}

export interface ProductPage {
  content: Product[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

export interface AdminProductPage {
  content: Product[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'BOLETO'
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'RETURNED' | 'DELIVERED' | 'CANCELLED'
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
  checkoutUrl?: string
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
  receiptUrl?: string
  paymentRejectionReason?: string
  createdAt: string
  itemCount: number
}

export interface AdminOrderPage {
  content: AdminOrderResponse[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

export interface OrderStatusHistoryResponse {
  id: string
  fromStatus: OrderStatus | null
  toStatus: OrderStatus
  changedByEmail: string | null
  reason: string | null
  attachmentUrls: string[]
  createdAt: string
}

export interface AdminOrderDetailResponse extends AdminOrderResponse {
  items: OrderItemResponse[]
  address: Address
  statusHistory: OrderStatusHistoryResponse[]
}

export type OrderChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface OrderChangeRequest {
  id: string
  orderId: string
  orderNumber: number
  requestedByEmail: string
  fromStatus: OrderStatus
  toStatus: OrderStatus
  justification: string
  attachmentUrls: string[]
  status: OrderChangeRequestStatus
  resolvedByEmail: string | null
  resolvedAt: string | null
  createdAt: string
}

export interface OrderChangeRequestPage {
  content: OrderChangeRequest[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus
  reason: string
  attachmentUrls?: string[]
}

export interface CreateOrderChangeRequestPayload {
  toStatus: OrderStatus
  justification: string
  attachmentUrls?: string[]
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
  photoUrl?: string
}

export interface EmployeeFormData {
  name: string
  email: string
  password: string
}

export interface EmployeePage {
  content: Employee[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

export interface EmployeeDetailResponse extends Employee {
  createdAt: string
}

export interface CustomerResponse {
  id: string
  name: string
  email: string
}

export interface CustomerPage {
  content: CustomerResponse[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

export interface CustomerDetailResponse {
  id: string
  name: string
  email: string
  createdAt: string
  addresses: Address[]
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

export interface ProductReview {
  id: string
  productId: string
  userId: string
  userName: string
  rating: number
  comment?: string
  imageUrls: string[]
  createdAt: string
  updatedAt: string
}

export interface ProductReviewPage {
  content: ProductReview[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
  averageRating: number | null
  totalReviews: number
}

export interface MyReviewableProduct {
  productId: string
  productName: string
  productImageUrl?: string
  review: ProductReview | null
}
