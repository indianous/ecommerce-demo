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
  | 'MANAGE_ANALYTICS'

export type TaxRegime = 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL'

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
  fiscalCompanyCnpj: string | null
  fiscalCompanyLegalName: string | null
  fiscalCompanyTradeName: string | null
  fiscalCompanyStateRegistration: string | null
  fiscalCompanyTaxRegime: TaxRegime | null
  fiscalCompanyStreet: string | null
  fiscalCompanyNumber: string | null
  fiscalCompanyNeighborhood: string | null
  fiscalCompanyCity: string | null
  fiscalCompanyState: string | null
  fiscalCompanyZipCode: string | null
  fiscalCompanyEmail: string | null
  fiscalCompanyPhone: string | null
  pixKey: string | null
  pixKeyHolder: string | null
  pixQrCodeUrl: string | null
}

/** Formas de pagamento aceitas pelo gateway ativo em cada tipo de entrega (lista vazia = entrega indisponível). */
export type PaymentMethodsByDelivery = Record<DeliveryMethod, PaymentMethod[]>

export interface FiscalCompanyData {
  cnpj: string
  legalName: string
  tradeName?: string
  stateRegistration?: string
  taxRegime: TaxRegime
  street: string
  number: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
  email: string
  phone: string
}

export type PaymentGatewayProvider = 'MANUAL' | 'STRIPE' | 'PAGSEGURO'

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

export type SiteNavItemType = 'LINK' | 'COLLECTION'
export type NavPlacement = 'NAVBAR' | 'FOOTER' | 'BOTH'

export interface SiteNavItem {
  id: string
  type: SiteNavItemType
  label: string
  url?: string
  placement: NavPlacement | null
  position: number
  children?: SiteNavItem[]
}

export type Gender = 'FEMININO' | 'MASCULINO' | 'NAO_BINARIO' | 'PREFIRO_NAO_DIZER'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  permissions: EmployeePermission[]
  phone: string | null
  birthDate: string | null
  gender: Gender
  cpf: string | null
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

export interface DistributionCenter {
  id: string
  name: string
  phone?: string
  street: string
  number: string
  complement?: string
  district: string
  city: string
  state: string
  zipCode: string
  active: boolean
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
}

export type ProductStatus = 'AVAILABLE' | 'UNAVAILABLE'

export type ProductSort = 'NAME_ASC' | 'PRICE_ASC' | 'PRICE_DESC' | 'NEWEST'

export type MerchandiseOrigin =
  | 'NACIONAL'
  | 'ESTRANGEIRA_IMPORTACAO_DIRETA'
  | 'ESTRANGEIRA_ADQUIRIDA_MERCADO_INTERNO'
  | 'NACIONAL_CONTEUDO_IMPORTACAO_SUPERIOR_40'
  | 'NACIONAL_PROCESSO_PRODUTIVO_BASICO'
  | 'NACIONAL_CONTEUDO_IMPORTACAO_INFERIOR_IGUAL_40'
  | 'ESTRANGEIRA_IMPORTACAO_DIRETA_SEM_SIMILAR'
  | 'ESTRANGEIRA_ADQUIRIDA_MERCADO_INTERNO_SEM_SIMILAR'
  | 'NACIONAL_CONTEUDO_IMPORTACAO_SUPERIOR_70'

export interface Product {
  id: string
  categories: Category[]
  name: string
  slug: string
  metaTitle?: string
  metaDescription?: string
  description?: string
  price: number
  stockQuantity: number
  imageUrls: string[]
  ncm?: string
  cfop?: string
  commercialUnit?: string
  gtinEan?: string
  origin?: MerchandiseOrigin
  promotionalPrice?: number
  promotionStartDate?: string
  promotionEndDate?: string
  weight?: number
  height?: number
  width?: number
  length?: number
  freeShipping: boolean
  effectivePrice?: number
  onPromotion?: boolean
  viewCount?: number
  soldQuantityLast30Days?: number
  active: boolean
  status: ProductStatus
  createdAt: string
  updatedAt: string
  averageRating?: number
  reviewCount?: number
  isWishlisted?: boolean
}

export interface WishlistItem {
  productId: string
  productName: string
  imageUrl: string | null
  price: number
  addedAt: string
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

export interface BulkOperationResult {
  successCount: number
  failures: { id: string; reason: string }[]
}

export interface ProductImportReport {
  createdCount: number
  created: { name: string; slug: string; renamed: boolean }[]
  errors: { row: number; message: string }[]
  warnings: { row: number; message: string }[]
}

export type StockMovementType = 'ENTRY' | 'EXIT'
export type StockMovementReason = 'PURCHASE' | 'ADJUSTMENT' | 'LOSS_DAMAGE' | 'RETURN' | 'SALE' | 'OTHER'

export interface StockLot {
  id: string
  productId: string
  productName: string
  lotNumber?: string
  expiryDate?: string
  quantity: number
  initialQuantity: number
  createdAt: string
}

export interface StockLotPage {
  content: StockLot[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

export interface StockMovement {
  id: string
  productId: string
  type: StockMovementType
  reason: StockMovementReason
  quantity: number
  quantityBefore: number
  quantityAfter: number
  note?: string
  lotId: string
  lotNumber?: string
  lotExpiryDate?: string
  orderId?: string
  actorEmail?: string
  createdAt: string
}

export interface StockMovementPage {
  content: StockMovement[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'BOLETO' | 'PAY_ON_PICKUP'
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'RETURNED' | 'DELIVERED' | 'CANCELLED'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
export type DeliveryMethod = 'DELIVERY' | 'PICKUP'

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
  shippingCost?: number
  shippingCarrierName?: string
  shippingServiceName?: string
  trackingCode?: string
  shippingLabelUrl?: string
  deliveryMethod?: DeliveryMethod
  pickupLocation?: DistributionCenter
  paymentProvider?: PaymentGatewayProvider | null
  /** Validade do link de pagamento (só enquanto o pagamento está pendente). */
  paymentExpiresAt?: string | null
}

export interface ShippingQuote {
  serviceId: string
  carrierName: string
  serviceName: string
  price: number
  deliveryDays: number
}

export interface ShippingQuoteResponse {
  options: ShippingQuote[]
  freeShipping: boolean
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
  /** Gateway que criou o pagamento (nulo em pedidos antigos). */
  paymentProvider?: PaymentGatewayProvider | null
  createdAt: string
  itemCount: number
  shippingCost?: number
  shippingCarrierName?: string
  shippingServiceName?: string
  trackingCode?: string
  shippingLabelUrl?: string
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

export type InvoiceStatus = 'PROCESSING' | 'ISSUED' | 'ERROR' | 'CANCELLED'

export interface Invoice {
  id: string
  orderId: string
  status: InvoiceStatus
  accessKey?: string
  danfeUrl?: string
  errorMessage?: string
  issuedAt?: string
}

export interface AdminOrderDetailResponse extends AdminOrderResponse {
  items: OrderItemResponse[]
  address: Address
  statusHistory: OrderStatusHistoryResponse[]
  invoice?: Invoice
  deliveryMethod?: DeliveryMethod
  pickupLocation?: DistributionCenter
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
  role: 'EMPLOYEE' | 'ADMIN'
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

export interface CustomerPurchaseSummary {
  totalOrders: number
  totalSpent: number
  lastPurchaseAt: string | null
}

export interface CustomerOrderSummary {
  id: string
  orderNumber: number
  status: OrderStatus
  totalAmount: number
  createdAt: string
}

export interface CustomerReviewSummary {
  id: string
  productName: string
  productId: string
  rating: number
  comment: string
  createdAt: string
}

export interface CustomerCartItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface TrafficSourceSummary {
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  referrer: string | null
  landingPage: string | null
  capturedAt: string
}

export interface PageViewSummary {
  path: string
  viewedAt: string
}

export interface RecentlyViewedProduct {
  productId: string
  productName: string
  productSlug: string
  viewedAt: string
}

export interface FunnelResponse {
  visitors: number
  productViews: number
  cartAdds: number
  checkoutsStarted: number
  purchasesCompleted: number
  visitorToProductViewRate: number
  productViewToCartAddRate: number
  cartAddToCheckoutRate: number
  checkoutToPurchaseRate: number
}

export interface ChannelConversionResponse {
  channel: string
  signups: number
  buyers: number
  conversionRate: number
  revenue: number
  averageOrderValue: number
}

export type NotificationType = 'ORDER_STATUS_CHANGED'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  linkUrl: string | null
  readAt: string | null
  createdAt: string
}

export interface CustomerDetailResponse {
  id: string
  name: string
  email: string
  createdAt: string
  phone: string | null
  birthDate: string | null
  gender: Gender
  purchaseSummary: CustomerPurchaseSummary
  recentOrders: CustomerOrderSummary[]
  reviews: CustomerReviewSummary[]
  wishlist: WishlistItem[]
  currentCart: CustomerCartItem[]
  cartTotal: number
  addresses: Address[]
  trafficSource: TrafficSourceSummary | null
  recentPageViews: PageViewSummary[]
  recentlyViewedProducts: RecentlyViewedProduct[]
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
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
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
