/**
 * Gerador dos dados da demo.
 *
 * Lê `demo/data.config.json` (quantos registros criar de cada entidade), gera um conjunto de dados coerente e
 * escreve `demo/data.json` e as imagens SVG em `public/demo/images/`. O backend falso
 * (`demo/fake-backend/`) responde consultando esse `data.json`.
 *
 * Módulo único de propósito: o Node roda este arquivo direto (`node demo/generator/generate.ts`), mas importar
 * outro `.ts` exigiria a extensão no import, que o `tsconfig.json` herdado do original recusa. Por isso aqui só
 * entram imports de tipo (apagados na execução) e módulos do Node.
 *
 * Os campos calculados (média de avaliações, vendidos nos últimos 30 dias, status de promoção e de cupom) são
 * calculados aqui, em relação ao momento da geração. O backend falso desloca todas as datas juntas ao responder,
 * então essas contas continuam valendo em qualquer dia.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  Address,
  AdminOrderDetailResponse,
  AppNotification,
  AuditAction,
  AuditEntityType,
  AuditLogResponse,
  Banner,
  Category,
  Coupon,
  CouponRedemption,
  CouponStatus,
  CouponType,
  DistributionCenter,
  EmployeePermission,
  Gender,
  Invoice,
  OrderChangeRequest,
  OrderChangeRequestStatus,
  OrderItemResponse,
  OrderStatus,
  OrderStatusHistoryResponse,
  PaymentGatewayConfig,
  PaymentGatewayProvider,
  PaymentMethod,
  PaymentMethodsByDelivery,
  PaymentStatus,
  Product,
  ProductReview,
  Promotion,
  PromotionStatus,
  SiteNavItem,
  SiteSettings,
  StockLot,
  StockMovement,
  StockMovementReason,
  TrafficSourceSummary,
  User,
  UserRole,
} from '@/types'

// ── Configuração ────────────────────────────────────────────────────────────

interface ConfigField {
  default: number
  min: number
  max: number
  description: string
}

/** Cada campo de `data.config.json`: padrão, limites e o texto que vai para o schema. */
export const CONFIG_FIELDS = {
  seed: { default: 42, min: 0, max: 2 ** 31 - 1, description: 'Semente do gerador: a mesma semente gera sempre os mesmos dados.' },
  periodDays: { default: 90, min: 7, max: 365, description: 'Janela, em dias até hoje, em que caem pedidos, cadastros, avaliações e visitas.' },
  categories: { default: 6, min: 0, max: 12, description: 'Categorias de produto (moda).' },
  products: { default: 60, min: 0, max: 500, description: 'Produtos do catálogo.' },
  customers: { default: 30, min: 0, max: 1000, description: 'Clientes, além da conta fixa cliente@demo.com.' },
  employees: { default: 4, min: 0, max: 50, description: 'Funcionários, além da conta fixa funcionario@demo.com.' },
  admins: { default: 1, min: 0, max: 10, description: 'Administradores, além da conta fixa admin@demo.com.' },
  addressesPerCustomer: { default: 2, min: 0, max: 5, description: 'Endereços de cada cliente (o cliente fixo sempre tem ao menos um).' },
  orders: { default: 150, min: 0, max: 5000, description: 'Pedidos.' },
  orderChangeRequests: { default: 8, min: 0, max: 5000, description: 'Solicitações de alteração de status de pedido. Não passa do número de pedidos.' },
  reviews: { default: 120, min: 0, max: 5000, description: 'Avaliações de produto, sempre de quem recebeu o produto. Não passa do número de pedidos.' },
  wishlistItems: { default: 40, min: 0, max: 10000, description: 'Itens em listas de desejos.' },
  cartItems: { default: 20, min: 0, max: 10000, description: 'Itens em carrinhos abertos.' },
  coupons: { default: 5, min: 0, max: 50, description: 'Cupons de desconto.' },
  couponRedemptions: { default: 25, min: 0, max: 5000, description: 'Pedidos que usaram cupom. Não passa do número de pedidos.' },
  promotions: { default: 3, min: 0, max: 20, description: 'Promoções (ativas, agendadas e encerradas).' },
  stockMovements: { default: 200, min: 0, max: 20000, description: 'Movimentações de estoque. Cada produto tem ao menos a entrada inicial.' },
  distributionCenters: { default: 2, min: 0, max: 10, description: 'Centros de distribuição (retirada na loja).' },
  banners: { default: 3, min: 0, max: 6, description: 'Banners da home.' },
  navItems: { default: 6, min: 0, max: 12, description: 'Itens do menu de navegação do site.' },
  notifications: { default: 30, min: 0, max: 5000, description: 'Notificações de mudança de status de pedido.' },
  auditLogs: { default: 150, min: 0, max: 20000, description: 'Registros de auditoria das ações da equipe.' },
  pageViews: { default: 2000, min: 0, max: 50000, description: 'Visitas a páginas (alimentam a analytics).' },
} as const satisfies Record<string, ConfigField>

export type DemoConfig = { [K in keyof typeof CONFIG_FIELDS]: number }

export const CONFIG_DEFAULTS = Object.fromEntries(
  Object.entries(CONFIG_FIELDS).map(([key, field]) => [key, field.default]),
) as DemoConfig

/** Contas fixas, criadas sempre, além das quantidades da configuração. */
export const FIXED_ACCOUNTS = {
  customer: { email: 'cliente@demo.com', name: 'Cliente Demo', role: 'CUSTOMER' },
  employee: { email: 'funcionario@demo.com', name: 'Funcionário Demo', role: 'EMPLOYEE' },
  admin: { email: 'admin@demo.com', name: 'Admin Demo', role: 'ADMIN' },
} as const

/** Valida a configuração lida do JSON e completa os campos omitidos. Junta todos os erros numa mensagem só. */
export function validateConfig(raw: unknown): DemoConfig {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('A configuração precisa ser um objeto JSON.')
  }

  const errors: string[] = []
  const config = { ...CONFIG_DEFAULTS }

  for (const [key, value] of Object.entries(raw)) {
    if (key === '$schema') continue
    if (!(key in CONFIG_FIELDS)) {
      errors.push(`"${key}" não é um campo conhecido. Campos: ${Object.keys(CONFIG_FIELDS).join(', ')}.`)
      continue
    }
    const field = CONFIG_FIELDS[key as keyof DemoConfig]
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      errors.push(`"${key}" precisa ser um número inteiro.`)
    } else if (value < field.min) {
      errors.push(`"${key}" precisa ser no mínimo ${field.min}.`)
    } else if (value > field.max) {
      errors.push(`"${key}" passou do máximo (${field.max}).`)
    } else {
      config[key as keyof DemoConfig] = value
    }
  }

  if (errors.length === 0) errors.push(...dependencyErrors(config))
  if (errors.length > 0) throw new Error(`data.config.json inválido:\n- ${errors.join('\n- ')}`)
  return config
}

function dependencyErrors(c: DemoConfig): string[] {
  const errors: string[] = []
  const customerProductPairs = (c.customers + 1) * c.products

  if (c.products > 0 && c.categories === 0) errors.push('"products" exige ao menos uma categoria em "categories".')
  if (c.orders > 0 && c.products === 0) errors.push('"orders" exige ao menos um produto em "products".')
  if (c.reviews > 0 && c.orders === 0) errors.push('"reviews" exige pedidos em "orders".')
  if (c.reviews > c.orders) errors.push(`"reviews" (${c.reviews}) não pode passar de "orders" (${c.orders}).`)
  if (c.couponRedemptions > 0 && c.coupons === 0) errors.push('"couponRedemptions" exige cupons em "coupons".')
  if (c.couponRedemptions > c.orders) errors.push(`"couponRedemptions" (${c.couponRedemptions}) não pode passar de "orders" (${c.orders}).`)
  if (c.orderChangeRequests > c.orders) errors.push(`"orderChangeRequests" (${c.orderChangeRequests}) não pode passar de "orders" (${c.orders}).`)
  if (c.notifications > 0 && c.orders === 0) errors.push('"notifications" exige pedidos em "orders".')
  if (c.promotions > 0 && c.products === 0) errors.push('"promotions" exige produtos em "products".')
  if (c.stockMovements > 0 && c.products === 0) errors.push('"stockMovements" exige produtos em "products".')
  if (c.stockMovements < c.products) errors.push(`"stockMovements" (${c.stockMovements}) precisa ser ao menos "products" (${c.products}): cada produto tem a entrada inicial.`)
  if (c.wishlistItems > customerProductPairs) errors.push(`"wishlistItems" (${c.wishlistItems}) passa do total de pares cliente × produto (${customerProductPairs}).`)
  if (c.cartItems > customerProductPairs) errors.push(`"cartItems" (${c.cartItems}) passa do total de pares cliente × produto (${customerProductPairs}).`)
  return errors
}

/** JSON Schema de `data.config.json`, para autocompletar e validar no editor. */
export function buildConfigSchema() {
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Quantidades dos dados da demo',
    description: 'Depois de alterar, rode `node demo/generator/generate.ts` para regerar demo/data.json e as imagens.',
    type: 'object',
    additionalProperties: false,
    properties: {
      $schema: { type: 'string' },
      ...Object.fromEntries(
        Object.entries(CONFIG_FIELDS).map(([key, field]) => [
          key,
          { type: 'integer', minimum: field.min, maximum: field.max, default: field.default, description: field.description },
        ]),
      ),
    },
  }
}

// ── Formato do data.json ────────────────────────────────────────────────────

export interface DemoUser extends User {
  emailVerified: boolean
  mfaEnabled: boolean
  passwordSet: boolean
  primaryAdmin: boolean
  createdAt: string
  trafficSource: TrafficSourceSummary | null
}

export interface DemoProduct extends Product {
  colorName: string
  colorHex: string
  viewCount: number
  soldQuantityLast30Days: number
  averageRating: number
  reviewCount: number
  effectivePrice: number
  onPromotion: boolean
}

export type DemoAddress = Address & { userId: string }

export interface DemoOrder extends AdminOrderDetailResponse {
  userId: string
  checkoutUrl?: string
  paymentExpiresAt?: string | null
}

export interface DemoPromotion extends Promotion {
  productIds: string[]
}

export type DemoCouponRedemption = CouponRedemption & { couponId: string }
export type DemoNotification = AppNotification & { userId: string }

export interface DemoWishlistItem {
  userId: string
  productId: string
  addedAt: string
}

export interface DemoCartItem extends DemoWishlistItem {
  quantity: number
}

export interface DemoPageView {
  sessionId: string
  userId: string | null
  path: string
  productId: string | null
  viewedAt: string
}

export interface DemoCartAddEvent {
  userId: string
  productId: string
  createdAt: string
}

export interface DemoData {
  generatedAt: string
  config: DemoConfig
  /** E-mails das contas fixas, para o backend falso não precisar importar o gerador. */
  fixedAccounts: Record<keyof typeof FIXED_ACCOUNTS, string>

  settings: SiteSettings
  paymentGateway: PaymentGatewayConfig
  paymentMethods: PaymentMethodsByDelivery
  melhorEnvioConnected: boolean
  categories: Category[]
  products: DemoProduct[]
  users: DemoUser[]
  addresses: DemoAddress[]
  distributionCenters: DistributionCenter[]
  promotions: DemoPromotion[]
  coupons: Coupon[]
  couponRedemptions: DemoCouponRedemption[]
  orders: DemoOrder[]
  orderChangeRequests: OrderChangeRequest[]
  reviews: ProductReview[]
  wishlist: DemoWishlistItem[]
  carts: DemoCartItem[]
  stockLots: StockLot[]
  stockMovements: StockMovement[]
  banners: Banner[]
  navItems: SiteNavItem[]
  notifications: DemoNotification[]
  auditLogs: AuditLogResponse[]
  pageViews: DemoPageView[]
  cartAddEvents: DemoCartAddEvent[]
}

/** Imagens geradas: caminho relativo a `public/demo/images/` → conteúdo SVG. */
export type DemoImages = Record<string, string>

// ── Textos ──────────────────────────────────────────────────────────────────

interface CategorySeed {
  name: string
  slug: string
  shape: Shape
  piece: string
  styles: string[]
  price: [number, number]
  ncm: string
  material: string
  description: string
}

interface Words {
  firstNames: Record<'FEMININO' | 'MASCULINO' | 'NAO_BINARIO', string[]>
  lastNames: string[]
  streets: string[]
  districts: string[]
  cities: { city: string; state: string; zip: string }[]
  complements: string[]
  colors: { name: string; hex: string }[]
  categories: CategorySeed[]
  reviewComments: Record<'1' | '2' | '3' | '4' | '5', string[]>
  statusReasons: Partial<Record<OrderStatus, string>>
  changeRequestJustifications: string[]
  stockNotes: Partial<Record<StockMovementReason, string>>
  coupons: { code: string; type: CouponType; value: number; maxDiscountAmount: number | null; minSubtotal: number | null }[]
  promotions: string[]
  banners: { title: string; subtitle: string; link: string }[]
  distributionCenters: { name: string; city: string; state: string; zip: string; street: string; number: string; district: string }[]
  trafficSources: Omit<TrafficSourceSummary, 'landingPage' | 'capturedAt'>[]
  site: Record<string, string>
}

const GENERATOR_DIR = path.dirname(fileURLToPath(import.meta.url))
const WORDS: Words = JSON.parse(readFileSync(path.join(GENERATOR_DIR, 'pt-br.json'), 'utf8'))

const ALL_PERMISSIONS: EmployeePermission[] = [
  'MANAGE_PRODUCTS', 'MANAGE_CUSTOMERS', 'MANAGE_ORDERS', 'MANAGE_STOCK', 'MANAGE_SHIPPING', 'MANAGE_PAYMENTS',
  'RESTORE_PRODUCTS', 'MANAGE_EMPLOYEES', 'MANAGE_ORDER_STATUS_REQUESTS', 'MANAGE_SITE', 'MANAGE_ANALYTICS',
  'MANAGE_COUPONS', 'CREATE_ORDERS',
]

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'recebido',
  CONFIRMED: 'confirmado',
  SHIPPED: 'enviado',
  DELIVERED: 'entregue',
  CANCELLED: 'cancelado',
  RETURNED: 'devolvido',
}

// ── Aleatoriedade com semente ───────────────────────────────────────────────

type Random = ReturnType<typeof createRandom>

/** mulberry32: rápido, com semente, e igual em qualquer máquina. */
function createRandom(seed: number) {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1))
  const pick = <T>(list: readonly T[]): T => list[Math.floor(next() * list.length)]
  const shuffle = <T>(list: readonly T[]): T[] => {
    const copy = [...list]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }
  return {
    next,
    int,
    pick,
    shuffle,
    chance: (probability: number) => next() < probability,
    sample: <T>(list: readonly T[], count: number): T[] => shuffle(list).slice(0, count),
    weighted: <T extends string | number>(weights: [T, number][]): T => {
      const total = weights.reduce((acc, [, w]) => acc + w, 0)
      let roll = next() * total
      for (const [value, weight] of weights) {
        roll -= weight
        if (roll < 0) return value
      }
      return weights[weights.length - 1][0]
    },
    digits: (length: number) => Array.from({ length }, () => int(0, 9)).join(''),
    hex: (length: number) => Array.from({ length }, () => int(0, 15).toString(16)).join(''),
    uuid: () => {
      const h = Array.from({ length: 32 }, () => int(0, 15).toString(16))
      h[12] = '4'
      h[16] = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16)
      const s = h.join('')
      return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`
    },
  }
}

// ── Utilidades ──────────────────────────────────────────────────────────────

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const iso = (ms: number) => new Date(Math.round(ms / 1000) * 1000).toISOString()
const isoDate = (ms: number) => iso(ms).slice(0, 10)
const round2 = (value: number) => Math.round(value * 100) / 100

function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function cpfFrom(random: Random) {
  const base = Array.from({ length: 9 }, () => random.int(0, 9))
  if (base.every((d) => d === base[0])) base[8] = (base[0] + 1) % 10
  const check = (digits: number[]) => {
    const sum = digits.reduce((acc, d, i) => acc + d * (digits.length + 1 - i), 0)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  const d1 = check(base)
  const d2 = check([...base, d1])
  const s = [...base, d1, d2].join('')
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`
}

function cnpjFrom(random: Random) {
  const base = [...Array.from({ length: 8 }, () => random.int(0, 9)), 0, 0, 0, 1]
  const check = (digits: number[]) => {
    const weights = digits.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const rest = digits.reduce((acc, d, i) => acc + d * weights[i], 0) % 11
    return rest < 2 ? 0 : 11 - rest
  }
  const d1 = check(base)
  const d2 = check([...base, d1])
  const s = [...base, d1, d2].join('')
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`
}

function eanFrom(random: Random) {
  const base = `789${random.digits(9)}`
  const sum = [...base].reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0)
  return `${base}${(10 - (sum % 10)) % 10}`
}

const phoneFrom = (random: Random) => `(${random.pick(['11', '21', '31', '41', '51', '61', '71', '81'])}) 9${random.digits(4)}-${random.digits(4)}`

// ── Geração ─────────────────────────────────────────────────────────────────

export interface GenerateOptions {
  /** Momento da geração. Todas as datas são calculadas a partir dele. */
  now: Date
}

export function generate(config: DemoConfig, { now }: GenerateOptions): { data: DemoData; images: DemoImages } {
  const random = createRandom(config.seed)
  const NOW = now.getTime()
  const periodStart = NOW - config.periodDays * DAY
  const images: DemoImages = {}

  /** Um instante dentro da janela, mais denso perto de hoje. */
  const recentMs = (from = periodStart, to = NOW - 10 * MINUTE) => to - Math.pow(random.next(), 1.6) * (to - from)

  // Categorias
  const categorySeeds = WORDS.categories.slice(0, config.categories)
  const categories: Category[] = categorySeeds.map((seed) => ({ id: random.uuid(), name: seed.name, slug: seed.slug, description: seed.description }))

  // Usuários
  const usedEmails = new Set<string>()
  const personName = (gender: Gender) => {
    const pool = gender === 'FEMININO' || gender === 'MASCULINO' || gender === 'NAO_BINARIO' ? WORDS.firstNames[gender] : WORDS.firstNames[random.pick(['FEMININO', 'MASCULINO'] as const)]
    return `${random.pick(pool)} ${random.pick(WORDS.lastNames)}`
  }
  const uniqueEmail = (name: string, domain: string) => {
    const local = slugify(name).replace(/-/g, '.')
    let email = `${local}@${domain}`
    for (let n = 2; usedEmails.has(email); n++) email = `${local}${n}@${domain}`
    usedEmails.add(email)
    return email
  }
  const randomGender = () => random.weighted<Gender>([['FEMININO', 48], ['MASCULINO', 44], ['NAO_BINARIO', 4], ['PREFIRO_NAO_DIZER', 4]])

  const makeUser = (role: UserRole, fields: Partial<DemoUser> & { name: string; email: string; gender: Gender }): DemoUser => {
    usedEmails.add(fields.email)
    const staff = role !== 'CUSTOMER'
    return {
      id: random.uuid(),
      role,
      permissions: [],
      phone: phoneFrom(random),
      birthDate: isoDate(NOW - random.int(19, 60) * 365 * DAY - random.int(0, 364) * DAY),
      cpf: cpfFrom(random),
      emailVerified: true,
      mfaEnabled: staff,
      mfaEnabledAt: null,
      recoveryCodesRemaining: staff ? 10 : 0,
      passwordSet: true,
      primaryAdmin: false,
      createdAt: iso(periodStart - random.int(60, 400) * DAY),
      trafficSource: null,
      ...fields,
    }
  }

  const fixedCustomer = makeUser('CUSTOMER', { ...FIXED_ACCOUNTS.customer, gender: 'PREFIRO_NAO_DIZER', createdAt: iso(periodStart - 30 * DAY) })
  const fixedEmployee = makeUser('EMPLOYEE', { ...FIXED_ACCOUNTS.employee, gender: 'PREFIRO_NAO_DIZER', permissions: [...ALL_PERMISSIONS] })
  const fixedAdmin = makeUser('ADMIN', { ...FIXED_ACCOUNTS.admin, gender: 'PREFIRO_NAO_DIZER', primaryAdmin: true })

  const customers: DemoUser[] = [fixedCustomer]
  for (let i = 0; i < config.customers; i++) {
    const gender = randomGender()
    const name = personName(gender)
    const createdMs = random.chance(0.65) ? recentMs() : periodStart - random.int(1, 365) * DAY
    const source = random.chance(0.65) ? random.pick(WORDS.trafficSources) : null
    customers.push(
      makeUser('CUSTOMER', {
        name,
        email: uniqueEmail(name, 'example.com'),
        gender,
        phone: random.chance(0.8) ? phoneFrom(random) : null,
        birthDate: random.chance(0.75) ? isoDate(NOW - random.int(18, 65) * 365 * DAY - random.int(0, 364) * DAY) : null,
        cpf: random.chance(0.85) ? cpfFrom(random) : null,
        emailVerified: random.chance(0.92),
        mfaEnabled: random.chance(0.1),
        passwordSet: random.chance(0.95),
        createdAt: iso(createdMs),
        trafficSource: source
          ? { ...source, landingPage: random.pick(['/', '/catalog', '/catalog?onSale=true']), capturedAt: iso(createdMs) }
          : null,
      }),
    )
  }

  const employees: DemoUser[] = [fixedEmployee]
  for (let i = 0; i < config.employees; i++) {
    const gender = randomGender()
    const name = personName(gender)
    employees.push(
      makeUser('EMPLOYEE', {
        name,
        email: uniqueEmail(name, 'demo.com'),
        gender,
        permissions: random.sample(ALL_PERMISSIONS, random.int(3, 8)).sort((a, b) => ALL_PERMISSIONS.indexOf(a) - ALL_PERMISSIONS.indexOf(b)),
        passwordSet: i === 0 && config.employees > 1 ? false : true,
        mfaEnabled: !(i === 0 && config.employees > 1),
      }),
    )
  }

  const admins: DemoUser[] = [fixedAdmin]
  for (let i = 0; i < config.admins; i++) {
    const gender = randomGender()
    const name = personName(gender)
    admins.push(makeUser('ADMIN', { name, email: uniqueEmail(name, 'demo.com'), gender }))
  }
  for (const user of [...employees, ...admins]) if (user.mfaEnabled) user.mfaEnabledAt = user.createdAt

  const staff = [...employees, ...admins]
  const users = [...customers, ...employees, ...admins]

  // Endereços
  const addresses: DemoAddress[] = []
  for (const customer of customers) {
    const count = customer === fixedCustomer ? Math.max(1, config.addressesPerCustomer) : config.addressesPerCustomer
    for (let i = 0; i < count; i++) {
      const place = random.pick(WORDS.cities)
      addresses.push({
        id: random.uuid(),
        userId: customer.id,
        street: random.pick(WORDS.streets),
        number: String(random.int(10, 2500)),
        ...(random.chance(0.4) ? { complement: random.pick(WORDS.complements) } : {}),
        district: random.pick(WORDS.districts),
        city: place.city,
        state: place.state,
        zipCode: `${place.zip}${random.digits(3)}-${random.digits(3)}`,
        isDefault: i === 0,
      })
    }
  }
  const addressesOf = (userId: string) => addresses.filter((a) => a.userId === userId)

  // Centros de distribuição
  const distributionCenters: DistributionCenter[] = Array.from({ length: config.distributionCenters }, (_, i) => {
    const seed = WORDS.distributionCenters[i % WORDS.distributionCenters.length]
    const round = Math.floor(i / WORDS.distributionCenters.length)
    return {
      id: random.uuid(),
      name: round === 0 ? seed.name : `${seed.name} ${round + 1}`,
      phone: phoneFrom(random),
      street: seed.street,
      number: seed.number,
      district: seed.district,
      city: seed.city,
      state: seed.state,
      zipCode: seed.zip,
      active: !(config.distributionCenters >= 3 && i === config.distributionCenters - 1),
    }
  })
  const activeCenters = distributionCenters.filter((c) => c.active)

  // Produtos
  const usedNames = new Set<string>()
  const products: DemoProduct[] = []
  for (let i = 0; i < config.products; i++) {
    const seed = categorySeeds[i % categorySeeds.length]
    const category = categories[i % categories.length]
    let color = random.pick(WORDS.colors)
    let style = random.pick(seed.styles)
    for (let tries = 0; usedNames.has(`${seed.piece} ${style} ${color.name}`) && tries < 40; tries++) {
      color = random.pick(WORDS.colors)
      style = random.pick(seed.styles)
    }
    let name = `${seed.piece} ${style} ${color.name}`
    for (let n = 2; usedNames.has(name); n++) name = `${seed.piece} ${style} ${color.name} ${n}`
    usedNames.add(name)
    const slug = slugify(name)

    // O primeiro produto sempre existe antes da janela, para todo pedido ter o que vender.
    const createdMs = i === 0 || random.chance(0.7) ? periodStart - random.int(1, 180) * DAY - random.int(0, 23) * HOUR : recentMs()
    const price = Math.max(9.9, Math.floor(seed.price[0] + random.next() * (seed.price[1] - seed.price[0])) + 0.9)
    const imageUrls = [`/demo/images/products/${slug}.svg`, ...(random.chance(0.4) ? [`/demo/images/products/${slug}-detalhe.svg`] : [])]

    products.push({
      id: random.uuid(),
      categories: [category],
      name,
      slug,
      metaTitle: `${name} | ${WORDS.site.siteTitle}`,
      metaDescription: `${name} na ${WORDS.site.siteTitle}. ${seed.material}`,
      description: `${seed.piece} ${style.toLowerCase()} na cor ${color.name.toLowerCase()}. ${seed.material}\n\nLavar à mão ou na máquina em ciclo delicado, com água fria.`,
      price,
      stockQuantity: 0,
      imageUrls,
      ncm: seed.ncm,
      cfop: '5102',
      commercialUnit: 'UN',
      gtinEan: eanFrom(random),
      origin: random.chance(0.85) ? 'NACIONAL' : 'ESTRANGEIRA_IMPORTACAO_DIRETA',
      weight: round2(0.15 + random.next() * 1.1),
      height: random.int(3, 15),
      width: random.int(20, 40),
      length: random.int(25, 45),
      freeShipping: random.chance(0.2),
      effectivePrice: price,
      onPromotion: false,
      viewCount: 0,
      soldQuantityLast30Days: 0,
      active: i < 3 || !random.chance(0.05),
      status: i < 3 || !random.chance(0.08) ? 'AVAILABLE' : 'UNAVAILABLE',
      createdAt: iso(createdMs),
      updatedAt: iso(createdMs),
      averageRating: 0,
      reviewCount: 0,
      colorName: color.name,
      colorHex: color.hex,
    })
    images[`products/${slug}.svg`] = productSvg(seed.shape, color.hex, i, false)
    if (imageUrls.length > 1) images[`products/${slug}-detalhe.svg`] = productSvg(seed.shape, color.hex, i, true)
  }
  const productById = new Map(products.map((p) => [p.id, p]))
  const createdMsOf = (p: { createdAt: string }) => Date.parse(p.createdAt)

  // Promoções
  const inPromotion = new Set<string>()
  const promotions: DemoPromotion[] = []
  const promotionCycle: PromotionStatus[] = ['ACTIVE', 'EXPIRED', 'SCHEDULED']
  for (let i = 0; i < config.promotions; i++) {
    const status = promotionCycle[i % promotionCycle.length]
    const startMs =
      status === 'ACTIVE' ? NOW - random.int(3, 20) * DAY : status === 'EXPIRED' ? NOW - random.int(40, 80) * DAY : NOW + random.int(3, 10) * DAY
    const endMs = status === 'ACTIVE' ? NOW + random.int(5, 25) * DAY : startMs + 14 * DAY
    const pool = products.filter((p) => p.active && !inPromotion.has(p.id))
    const chosen = random.sample(pool, Math.min(pool.length, random.int(3, 8)))
    chosen.forEach((p) => inPromotion.add(p.id))
    const name = WORDS.promotions[i % WORDS.promotions.length] + (i >= WORDS.promotions.length ? ` ${Math.floor(i / WORDS.promotions.length) + 1}` : '')
    promotions.push({
      id: random.uuid(),
      name,
      type: 'PERCENT',
      value: random.pick([10, 15, 20, 25, 30, 40]),
      startDate: iso(startMs),
      endDate: iso(endMs),
      status,
      productCount: chosen.length,
      productIds: chosen.map((p) => p.id),
    })
  }
  const promotionalPrice = (price: number, percent: number) => Math.max(1, Math.floor(price * (1 - percent / 100)) + 0.9)
  for (const promotion of promotions) {
    if (promotion.status === 'EXPIRED') continue
    for (const id of promotion.productIds) {
      const product = productById.get(id)!
      product.promotionalPrice = promotionalPrice(product.price, promotion.value)
      product.promotionStartDate = promotion.startDate
      product.promotionEndDate = promotion.endDate
      product.promotionId = promotion.id
      product.promotionName = promotion.name
      if (promotion.status === 'ACTIVE') {
        product.onPromotion = true
        product.effectivePrice = product.promotionalPrice
      }
    }
  }
  const priceAt = (product: DemoProduct, ms: number) => {
    const promotion = promotions.find(
      (p) => p.productIds.includes(product.id) && Date.parse(p.startDate) <= ms && ms <= Date.parse(p.endDate),
    )
    return promotion ? promotionalPrice(product.price, promotion.value) : product.price
  }

  // Cupons
  const couponCycle: CouponStatus[] = ['ACTIVE', 'ACTIVE', 'EXPIRED', 'SCHEDULED', 'INACTIVE', 'EXHAUSTED']
  const couponPlan = Array.from({ length: config.coupons }, (_, i) => {
    const seed = WORDS.coupons[i % WORDS.coupons.length]
    const round = Math.floor(i / WORDS.coupons.length)
    const planned = couponCycle[i] ?? 'ACTIVE'
    const startsMs = planned === 'SCHEDULED' ? NOW + 5 * DAY : periodStart - 10 * DAY
    const endsMs =
      planned === 'SCHEDULED' ? NOW + 35 * DAY : planned === 'EXPIRED' ? NOW - Math.round(config.periodDays / 2) * DAY : i === 0 ? null : NOW + 30 * DAY
    const coupon: Coupon = {
      id: random.uuid(),
      code: round === 0 ? seed.code : `${seed.code}${round + 1}`,
      type: seed.type,
      value: seed.value,
      maxDiscountAmount: seed.maxDiscountAmount,
      minSubtotal: seed.minSubtotal,
      startsAt: iso(startsMs),
      endsAt: endsMs === null ? null : iso(endsMs),
      maxUses: planned === 'EXHAUSTED' ? null : i % 2 === 0 ? null : 500,
      maxUsesPerCustomer: i === 0 ? 1 : null,
      active: planned !== 'INACTIVE',
      usesCount: 0,
      status: planned,
    }
    return { coupon, planned }
  })
  const coupons = couponPlan.map((c) => c.coupon)
  const couponValidAt = (coupon: Coupon, ms: number) =>
    Date.parse(coupon.startsAt!) <= ms && (coupon.endsAt === null || ms <= Date.parse(coupon.endsAt))

  // Pedidos — datas, clientes e itens
  const orderDates = Array.from({ length: config.orders }, () => recentMs()).sort((a, b) => a - b)
  const fixedOrderCount = config.orders === 0 ? 0 : Math.min(config.orders, Math.max(5, Math.round(config.orders * 0.05)))
  const fixedOrderSlots = new Set(Array.from({ length: fixedOrderCount }, (_, k) => Math.floor(((k + 0.5) * config.orders) / fixedOrderCount)))
  const otherCustomers = customers.length > 1 ? customers.slice(1) : customers

  interface Draft {
    createdMs: number
    customer: DemoUser
    items: OrderItemResponse[]
    status: OrderStatus
  }
  const drafts: Draft[] = orderDates.map((createdMs, index) => {
    const customer = fixedOrderSlots.has(index) ? fixedCustomer : random.pick(otherCustomers)
    const available = products.filter((p) => createdMsOf(p) < createdMs)
    const itemCount = Math.min(available.length, random.weighted<number>([[1, 40], [2, 35], [3, 18], [4, 7]]))
    const items = random.sample(available, itemCount).map((product) => {
      const quantity = random.chance(0.8) ? 1 : 2
      const unitPrice = priceAt(product, createdMs)
      return { productId: product.id, productName: product.name, quantity, unitPrice, subtotal: round2(unitPrice * quantity) }
    })
    const ageDays = (NOW - createdMs) / DAY
    const status =
      ageDays < 2
        ? random.weighted<OrderStatus>([['PENDING', 50], ['CONFIRMED', 35], ['CANCELLED', 15]])
        : ageDays < 7
          ? random.weighted<OrderStatus>([['CONFIRMED', 30], ['SHIPPED', 45], ['PENDING', 10], ['CANCELLED', 15]])
          : random.weighted<OrderStatus>([['DELIVERED', 75], ['CANCELLED', 12], ['RETURNED', 7], ['SHIPPED', 6]])
    return { createdMs, customer, items, status }
  })

  // Todo status aparece pelo menos uma vez (quando há pedidos suficientes)
  const allStatuses: OrderStatus[] = ['DELIVERED', 'PENDING', 'CONFIRMED', 'SHIPPED', 'CANCELLED', 'RETURNED']
  if (drafts.length >= allStatuses.length) {
    for (const status of allStatuses) {
      if (drafts.some((d) => d.status === status)) continue
      const counts = new Map<OrderStatus, number>()
      drafts.forEach((d) => counts.set(d.status, (counts.get(d.status) ?? 0) + 1))
      const candidates = drafts.filter((d) => counts.get(d.status)! > 1)
      const newest = status === 'PENDING' || status === 'CONFIRMED'
      const target = newest ? candidates[candidates.length - 1] : candidates[0]
      if (target) target.status = status
    }
  }

  // Avaliações exigem pares cliente × produto entregues: entrega pedidos antigos até ter pares suficientes
  const deliveredPairs = new Map<string, { userId: string; productId: string; draft: Draft }>()
  const addPairs = (d: Draft) => {
    for (const item of d.items) deliveredPairs.set(`${d.customer.id}:${item.productId}`, { userId: d.customer.id, productId: item.productId, draft: d })
  }
  drafts.filter((d) => d.status === 'DELIVERED').forEach(addPairs)
  const statusCounts = new Map<OrderStatus, number>()
  drafts.forEach((d) => statusCounts.set(d.status, (statusCounts.get(d.status) ?? 0) + 1))
  for (const d of drafts) {
    if (deliveredPairs.size >= config.reviews) break
    if (d.status === 'DELIVERED' || statusCounts.get(d.status)! <= 1) continue
    statusCounts.set(d.status, statusCounts.get(d.status)! - 1)
    d.status = 'DELIVERED'
    addPairs(d)
  }
  if (deliveredPairs.size < config.reviews) {
    throw new Error(
      `Não há compras entregues suficientes para ${config.reviews} avaliações (há ${deliveredPairs.size}). Aumente "orders" ou "products", ou diminua "reviews".`,
    )
  }

  // O cliente precisa existir antes do primeiro pedido
  for (const d of drafts) {
    if (Date.parse(d.customer.createdAt) >= d.createdMs) {
      d.customer.createdAt = iso(d.createdMs - random.int(1, 20) * DAY)
      if (d.customer.trafficSource) d.customer.trafficSource.capturedAt = d.customer.createdAt
    }
  }

  // Pedidos — montagem
  const pickStaff = () => random.pick(staff)
  const orders: DemoOrder[] = drafts.map((d, index) => {
    const subtotal = round2(d.items.reduce((acc, item) => acc + item.subtotal, 0))
    const ownAddresses = addressesOf(d.customer.id)
    const pickup = activeCenters.length > 0 && (ownAddresses.length === 0 || random.chance(0.12))
    const origin = random.chance(0.1) ? 'STAFF' : 'WEB'
    const creator = origin === 'STAFF' ? pickStaff() : null

    const paymentMethod: PaymentMethod = pickup
      ? random.weighted<PaymentMethod>([['PAY_ON_PICKUP', 40], ['PIX', 35], ['CREDIT_CARD', 25]])
      : random.weighted<PaymentMethod>([['PIX', 45], ['CREDIT_CARD', 42], ['BOLETO', 13]])
    const paymentProvider: PaymentGatewayProvider =
      origin === 'STAFF' || paymentMethod === 'PAY_ON_PICKUP' ? 'MANUAL' : paymentMethod === 'PIX' ? 'PAGSEGURO' : 'STRIPE'
    const paymentStatus: PaymentStatus =
      d.status === 'PENDING'
        ? random.chance(0.15) ? 'FAILED' : 'PENDING'
        : d.status === 'CANCELLED'
          ? random.weighted<PaymentStatus>([['FAILED', 60], ['REFUNDED', 25], ['PENDING', 15]])
          : d.status === 'RETURNED'
            ? 'REFUNDED'
            : 'PAID'

    const free = d.items.every((item) => productById.get(item.productId)!.freeShipping) || subtotal >= 299
    const quote = random.pick([
      { carrier: 'Correios', service: 'PAC', price: 18.9 + random.int(0, 11) },
      { carrier: 'Correios', service: 'SEDEX', price: 29.9 + random.int(0, 20) },
      { carrier: 'Jadlog', service: '.Package', price: 22.9 + random.int(0, 13) },
    ])
    const shippingCost = pickup || free ? 0 : round2(quote.price)

    // Histórico de status
    const path: OrderStatus[] =
      d.status === 'PENDING' ? ['PENDING']
        : d.status === 'CANCELLED' ? ['PENDING', 'CANCELLED']
          : d.status === 'CONFIRMED' ? ['PENDING', 'CONFIRMED']
            : d.status === 'SHIPPED' ? ['PENDING', 'CONFIRMED', 'SHIPPED']
              : d.status === 'DELIVERED' ? ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED']
                : ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'RETURNED']
    const gaps: Record<OrderStatus, [number, number]> = {
      PENDING: [0, 0],
      CONFIRMED: [10 * MINUTE, 6 * HOUR],
      SHIPPED: [1 * DAY, 2 * DAY],
      DELIVERED: [2 * DAY, 6 * DAY],
      RETURNED: [3 * DAY, 10 * DAY],
      CANCELLED: [1 * DAY, 3 * DAY],
    }
    const wanted = path.map((s) => gaps[s][0] + random.next() * (gaps[s][1] - gaps[s][0]))
    const totalWanted = wanted.reduce((acc, g) => acc + g, 0)
    const room = NOW - MINUTE - d.createdMs
    const scale = totalWanted > room ? room / totalWanted : 1
    let at = d.createdMs
    const statusHistory: OrderStatusHistoryResponse[] = path.map((toStatus, k) => {
      at += wanted[k] * scale
      const byStaff = toStatus !== 'PENDING' && toStatus !== 'CONFIRMED' && !(toStatus === 'CANCELLED' && paymentStatus === 'FAILED')
      return {
        id: random.uuid(),
        fromStatus: k === 0 ? null : path[k - 1],
        toStatus,
        changedByEmail: byStaff ? pickStaff().email : null,
        reason: k === 0 ? null : (WORDS.statusReasons[toStatus] ?? null),
        attachmentUrls: [],
        createdAt: k === 0 ? iso(d.createdMs) : iso(at),
      }
    })
    const reachedAt = (status: OrderStatus) => statusHistory.find((h) => h.toStatus === status)?.createdAt

    const address = pickup || ownAddresses.length === 0 ? null : random.pick(ownAddresses)
    const shipped = !pickup && ['SHIPPED', 'DELIVERED', 'RETURNED'].includes(d.status)
    const invoice: Invoice | undefined =
      shipped && random.chance(0.7)
        ? { id: random.uuid(), orderId: '', status: 'ISSUED', accessKey: random.digits(44), issuedAt: reachedAt('SHIPPED') }
        : undefined
    const pendingLink = origin === 'WEB' && paymentStatus === 'PENDING' && d.status === 'PENDING' && paymentMethod !== 'PAY_ON_PICKUP'

    const id = random.uuid()
    if (invoice) invoice.orderId = id
    const order: DemoOrder = {
      id,
      userId: d.customer.id,
      orderNumber: 1001 + index,
      customerName: d.customer.name,
      customerEmail: d.customer.email,
      status: d.status,
      totalAmount: round2(subtotal + shippingCost),
      discountAmount: 0,
      couponCode: null,
      paymentMethod,
      paymentStatus,
      ...(paymentStatus !== 'PENDING' || paymentMethod === 'CREDIT_CARD' ? { paymentId: `pay_demo_${random.hex(16)}` } : {}),
      ...(paymentStatus === 'FAILED' ? { paymentRejectionReason: 'Pagamento recusado pelo emissor do cartão.' } : {}),
      paymentProvider,
      createdAt: iso(d.createdMs),
      itemCount: d.items.reduce((acc, item) => acc + item.quantity, 0),
      shippingCost,
      ...(pickup ? {} : { shippingCarrierName: quote.carrier, shippingServiceName: quote.service }),
      ...(shipped ? { trackingCode: `${random.pick(['AA', 'QB', 'OY'])}${random.digits(9)}BR` } : {}),
      origin,
      createdByName: creator?.name ?? null,
      notes: creator ? random.pick(['Pedido feito por telefone.', 'Cliente comprou na loja física.', 'Pedido pelo WhatsApp.']) : null,
      items: d.items,
      address: address ? stripUserId(address) : null,
      paymentCheckoutUrl: pendingLink ? '/orders' : null,
      statusHistory,
      ...(invoice ? { invoice } : {}),
      deliveryMethod: pickup ? 'PICKUP' : 'DELIVERY',
      ...(pickup ? { pickupLocation: random.pick(activeCenters) } : {}),
      ...(pendingLink ? { checkoutUrl: '/orders', paymentExpiresAt: iso(d.createdMs + 3 * DAY) } : {}),
    }
    return order
  })
  if (orders.length > 0 && !orders.some((o) => o.paymentStatus === 'FAILED')) {
    const target = orders.find((o) => o.status === 'CANCELLED') ?? orders.find((o) => o.status === 'PENDING')
    if (target) target.paymentStatus = 'FAILED'
  }
  if (orders.length > 0 && !orders.some((o) => o.paymentStatus === 'PENDING')) {
    const target = orders.findLast((o) => o.status === 'PENDING')
    if (target) target.paymentStatus = 'PENDING'
  }

  // Usos de cupom
  const couponRedemptions: DemoCouponRedemption[] = []
  for (const order of random.sample(orders, config.couponRedemptions)) {
    const ms = Date.parse(order.createdAt)
    const subtotal = round2(order.items.reduce((acc, item) => acc + item.subtotal, 0))
    const valid = coupons.filter((c) => couponPlan.find((p) => p.coupon === c)!.planned !== 'SCHEDULED' && couponValidAt(c, ms))
    const eligible = valid.filter((c) => c.minSubtotal === null || subtotal >= c.minSubtotal)
    const coupon = random.pick(eligible.length > 0 ? eligible : valid.length > 0 ? valid : coupons)
    const raw = coupon.type === 'PERCENT' ? (subtotal * coupon.value) / 100 : coupon.value
    const discountAmount = round2(Math.min(subtotal, coupon.maxDiscountAmount === null ? raw : Math.min(raw, coupon.maxDiscountAmount)))
    order.couponCode = coupon.code
    order.discountAmount = discountAmount
    order.totalAmount = round2(subtotal - discountAmount + (order.shippingCost ?? 0))
    const cancelledAt = order.status === 'CANCELLED' ? order.statusHistory.at(-1)!.createdAt : null
    couponRedemptions.push({
      couponId: coupon.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      discountAmount,
      redeemedAt: order.createdAt,
      releasedAt: cancelledAt,
    })
  }
  couponRedemptions.sort((a, b) => a.redeemedAt.localeCompare(b.redeemedAt))
  for (const { coupon, planned } of couponPlan) {
    coupon.usesCount = couponRedemptions.filter((r) => r.couponId === coupon.id && r.releasedAt === null).length
    if (planned === 'EXHAUSTED') coupon.maxUses = Math.max(1, coupon.usesCount)
    coupon.status = couponStatus(coupon, NOW)
  }

  // Avaliações
  const reviewPairs = random.sample([...deliveredPairs.values()], config.reviews)
  const orderOfDraft = new Map(drafts.map((d, i) => [d, orders[i]]))
  const reviews: ProductReview[] = reviewPairs.map(({ userId, productId, draft }) => {
    const deliveredAt = Date.parse(orderOfDraft.get(draft)!.statusHistory.find((h) => h.toStatus === 'DELIVERED')!.createdAt)
    const createdMs = Math.min(NOW - MINUTE, deliveredAt + random.int(1, 15) * DAY)
    const rating = random.weighted<number>([[5, 50], [4, 28], [3, 12], [2, 6], [1, 4]])
    const comments = WORDS.reviewComments[String(rating) as keyof Words['reviewComments']]
    return {
      id: random.uuid(),
      productId,
      userId,
      userName: users.find((u) => u.id === userId)!.name,
      rating,
      ...(random.chance(0.85) ? { comment: random.pick(comments) } : {}),
      imageUrls: [],
      createdAt: iso(createdMs),
      updatedAt: iso(createdMs),
    }
  })
  reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  for (const product of products) {
    const own = reviews.filter((r) => r.productId === product.id)
    product.reviewCount = own.length
    product.averageRating = own.length === 0 ? 0 : Math.round((own.reduce((acc, r) => acc + r.rating, 0) / own.length) * 10) / 10
  }

  // Lista de desejos e carrinhos
  const sellable = products.filter((p) => p.active && p.status === 'AVAILABLE')
  const pairsFor = (count: number, fixedCount: number, pool: DemoProduct[]) => {
    const taken = new Set<string>()
    const result: { userId: string; productId: string }[] = []
    const add = (userId: string, productId: string) => {
      const key = `${userId}:${productId}`
      if (taken.has(key)) return false
      taken.add(key)
      result.push({ userId, productId })
      return true
    }
    for (const product of random.sample(pool, Math.min(fixedCount, count, pool.length))) add(fixedCustomer.id, product.id)
    const source = pool.length > 0 ? pool : products
    let attempts = 0
    while (result.length < count && attempts < count * 30) {
      attempts++
      add(random.pick(customers).id, random.pick(source).id)
    }
    if (result.length < count) {
      for (const customer of customers) for (const product of products) if (result.length < count) add(customer.id, product.id)
    }
    return result
  }
  const wishlist: DemoWishlistItem[] = pairsFor(config.wishlistItems, 3, products.filter((p) => p.active)).map((pair) => ({
    ...pair,
    addedAt: iso(recentMs()),
  }))
  const carts: DemoCartItem[] = pairsFor(config.cartItems, 2, sellable).map((pair) => ({
    ...pair,
    quantity: random.chance(0.8) ? 1 : 2,
    addedAt: iso(recentMs(NOW - 14 * DAY)),
  }))

  // Estoque
  const stockLots: StockLot[] = []
  const stockMovements: StockMovement[] = []
  {
    type Spec = { productId: string; ms: number; type: 'ENTRY' | 'EXIT'; reason: StockMovementReason; quantity: number; orderId?: string }
    const specs: Spec[] = []
    const extra = config.stockMovements - config.products
    const soldItems = orders
      .filter((o) => o.status !== 'PENDING' && o.status !== 'CANCELLED')
      .flatMap((o) =>
        o.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          orderId: o.id,
          ms: Date.parse(o.statusHistory.find((h) => h.toStatus === 'CONFIRMED')!.createdAt),
          returnedAt: o.statusHistory.find((h) => h.toStatus === 'RETURNED')?.createdAt,
        })),
      )
    const sales = random.sample(soldItems, Math.min(soldItems.length, Math.floor(extra * 0.55)))
    sales.forEach((s) => specs.push({ productId: s.productId, ms: s.ms, type: 'EXIT', reason: 'SALE', quantity: s.quantity, orderId: s.orderId }))
    for (const s of sales.filter((s) => s.returnedAt)) {
      if (specs.length >= extra) break
      specs.push({ productId: s.productId, ms: Math.min(NOW - MINUTE, Date.parse(s.returnedAt!) + HOUR), type: 'ENTRY', reason: 'RETURN', quantity: s.quantity, orderId: s.orderId })
    }
    const others: [StockMovementReason, 'ENTRY' | 'EXIT'][] = [
      ['PURCHASE', 'ENTRY'], ['PURCHASE', 'ENTRY'], ['ADJUSTMENT', 'ENTRY'], ['ADJUSTMENT', 'EXIT'], ['LOSS_DAMAGE', 'EXIT'], ['PURCHASE', 'ENTRY'], ['OTHER', 'EXIT'],
    ]
    for (let k = 0; specs.length < extra; k++) {
      const [reason, type] = others[k % others.length]
      const product = random.pick(products)
      const from = Math.min(Math.max(createdMsOf(product) + HOUR, periodStart), NOW - 5 * MINUTE)
      specs.push({
        productId: product.id,
        ms: from + random.next() * (NOW - MINUTE - from),
        type,
        reason,
        quantity: reason === 'PURCHASE' ? random.int(10, 40) : random.int(1, 3),
      })
    }

    let lotSeq = 0
    const newLot = (product: DemoProduct, quantity: number, ms: number): StockLot => {
      lotSeq++
      const lot: StockLot = {
        id: random.uuid(),
        productId: product.id,
        productName: product.name,
        lotNumber: `L${iso(ms).slice(0, 7).replace('-', '')}-${String(lotSeq).padStart(4, '0')}`,
        ...(random.chance(0.15) ? { expiryDate: isoDate(NOW + random.int(5, 60) * DAY) } : {}),
        quantity,
        initialQuantity: quantity,
        createdAt: iso(ms),
      }
      stockLots.push(lot)
      return lot
    }

    for (const product of products) {
      const own = specs.filter((s) => s.productId === product.id).sort((a, b) => a.ms - b.ms)
      const exits = own.filter((s) => s.type === 'EXIT').reduce((acc, s) => acc + s.quantity, 0)
      const initial = Math.max(random.int(30, 90), exits + random.int(5, 20))
      const startMs = createdMsOf(product)
      const lots = [newLot(product, initial, startMs)]
      let balance = 0
      const push = (spec: Omit<Spec, 'productId'>, lot: StockLot, note?: string) => {
        const before = balance
        balance += spec.type === 'ENTRY' ? spec.quantity : -spec.quantity
        stockMovements.push({
          id: random.uuid(),
          productId: product.id,
          type: spec.type,
          reason: spec.reason,
          quantity: spec.quantity,
          quantityBefore: before,
          quantityAfter: balance,
          ...(note ? { note } : {}),
          lotId: lot.id,
          lotNumber: lot.lotNumber,
          ...(lot.expiryDate ? { lotExpiryDate: lot.expiryDate } : {}),
          ...(spec.orderId ? { orderId: spec.orderId } : {}),
          actorEmail: pickStaff().email,
          createdAt: iso(spec.ms),
        })
      }
      push({ ms: startMs, type: 'ENTRY', reason: 'PURCHASE', quantity: initial }, lots[0], WORDS.stockNotes.PURCHASE)
      for (const spec of own) {
        const ms = Math.min(NOW - MINUTE, Math.max(spec.ms, startMs + MINUTE))
        if (spec.type === 'ENTRY') {
          const lot = spec.reason === 'PURCHASE' ? newLot(product, spec.quantity, ms) : lots[lots.length - 1]
          if (spec.reason === 'PURCHASE') lots.push(lot)
          else lot.quantity += spec.quantity
          push({ ...spec, ms }, lot, spec.reason === 'RETURN' ? WORDS.stockNotes.RETURN : WORDS.stockNotes[spec.reason])
        } else {
          const lot = lots.find((l) => l.quantity >= spec.quantity) ?? lots.reduce((a, b) => (b.quantity > a.quantity ? b : a))
          const quantity = Math.min(spec.quantity, lot.quantity)
          lot.quantity -= quantity
          push({ ...spec, ms, quantity }, lot, spec.reason === 'SALE' ? undefined : WORDS.stockNotes[spec.reason])
        }
      }
      product.stockQuantity = balance
    }
    stockMovements.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  // Solicitações de alteração de status
  const employeeStaff = staff.filter((u) => u.role === 'EMPLOYEE')
  const adminStaff = staff.filter((u) => u.role === 'ADMIN')
  const nextStatus: Record<OrderStatus, OrderStatus> = {
    PENDING: 'CANCELLED',
    CONFIRMED: 'CANCELLED',
    SHIPPED: 'DELIVERED',
    DELIVERED: 'RETURNED',
    CANCELLED: 'CONFIRMED',
    RETURNED: 'DELIVERED',
  }
  const orderChangeRequests: OrderChangeRequest[] = random.sample(orders, config.orderChangeRequests).map((order, k) => {
    const lastMs = Date.parse(order.statusHistory.at(-1)!.createdAt)
    const createdMs = lastMs + random.next() * (NOW - MINUTE - lastMs)
    const status: OrderChangeRequestStatus = k % 2 === 0 ? 'PENDING' : random.chance(0.6) ? 'APPROVED' : 'REJECTED'
    const resolvedMs = Math.min(NOW - MINUTE, createdMs + random.int(1, 30) * HOUR)
    return {
      id: random.uuid(),
      orderId: order.id,
      orderNumber: order.orderNumber,
      requestedByEmail: random.pick(employeeStaff).email,
      fromStatus: order.status,
      toStatus: nextStatus[order.status],
      justification: random.pick(WORDS.changeRequestJustifications),
      attachmentUrls: [],
      status,
      resolvedByEmail: status === 'PENDING' ? null : random.pick(adminStaff).email,
      resolvedAt: status === 'PENDING' ? null : iso(resolvedMs),
      createdAt: iso(createdMs),
    }
  })
  orderChangeRequests.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  // Notificações
  const statusEvents = orders.flatMap((order) =>
    order.statusHistory.slice(1).map((h) => ({ order, status: h.toStatus, ms: Date.parse(h.createdAt) })),
  )
  const notifications: DemoNotification[] = []
  if (config.notifications > 0 && statusEvents.length > 0) {
    const fixedEvents = statusEvents.filter((e) => e.order.userId === fixedCustomer.id).sort((a, b) => b.ms - a.ms)
    const chosen = fixedEvents.slice(0, Math.min(8, config.notifications))
    const rest = random.shuffle(statusEvents.filter((e) => e.order.userId !== fixedCustomer.id))
    for (let k = 0; chosen.length < config.notifications; k++) chosen.push((rest.length > 0 ? rest : statusEvents)[k % (rest.length || statusEvents.length)])
    chosen.forEach((event, k) => {
      const unread = event.order.userId === fixedCustomer.id ? k < 3 : random.chance(0.4)
      notifications.push({
        id: random.uuid(),
        userId: event.order.userId,
        type: 'ORDER_STATUS_CHANGED',
        title: `Pedido #${event.order.orderNumber} ${STATUS_LABELS[event.status]}`,
        message: `O status do seu pedido #${event.order.orderNumber} mudou para ${STATUS_LABELS[event.status]}.`,
        linkUrl: '/orders',
        readAt: unread ? null : iso(Math.min(NOW - MINUTE, event.ms + random.int(1, 48) * HOUR)),
        createdAt: iso(event.ms),
      })
    })
    notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  // Auditoria
  const auditTemplates: { weight: number; build: () => [AuditEntityType, string, AuditAction] | null }[] = [
    { weight: 30, build: () => (products.length ? ['PRODUCT', random.pick(products).id, random.pick(['CREATED', 'UPDATED', 'UPDATED', 'STATUS_UPDATED'] as AuditAction[])] : null) },
    { weight: 4, build: () => { const deleted = products.filter((p) => !p.active); return deleted.length ? ['PRODUCT', random.pick(deleted).id, 'DELETED'] : null } },
    { weight: 25, build: () => (orders.length ? ['ORDER', random.pick(orders).id, 'STATUS_UPDATED'] : null) },
    { weight: 6, build: () => (categories.length ? ['CATEGORY', random.pick(categories).id, random.pick(['CREATED', 'UPDATED'] as AuditAction[])] : null) },
    { weight: 6, build: () => (promotions.length ? ['PROMOTION', random.pick(promotions).id, random.pick(['CREATED', 'UPDATED'] as AuditAction[])] : null) },
    { weight: 6, build: () => (coupons.length ? ['COUPON', random.pick(coupons).id, random.pick(['CREATED', 'UPDATED', 'DEACTIVATED'] as AuditAction[])] : null) },
    { weight: 5, build: () => (addresses.length ? ['ADDRESS', random.pick(addresses).id, random.pick(['CREATED', 'UPDATED'] as AuditAction[])] : null) },
    {
      weight: 10,
      build: () => [
        'USER',
        random.pick(users).id,
        random.pick(['PASSWORD_CHANGED', 'PASSWORD_INVITE_SENT', 'MFA_ENABLED', 'MFA_RESET', 'MFA_RECOVERY_CODES_REGENERATED', 'UPDATED'] as AuditAction[]),
      ],
    },
  ]
  const auditDrafts: Omit<AuditLogResponse, 'id'>[] = []
  while (auditDrafts.length < config.auditLogs) {
    const template = auditTemplates[random.weighted(auditTemplates.map((t, k) => [k, t.weight] as [number, number]))]
    const built = template.build()
    if (!built) continue
    const actor = pickStaff()
    auditDrafts.push({ entityType: built[0], entityId: built[1], action: built[2], actorEmail: actor.email, actorRole: actor.role, createdAt: iso(recentMs()) })
  }
  const auditLogs: AuditLogResponse[] = auditDrafts
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((entry, k) => ({ id: k + 1, ...entry }))
    .reverse()

  // Visitas
  const pageViews: DemoPageView[] = []
  const visible = products.filter((p) => p.active)
  let sessionIndex = 0
  while (pageViews.length < config.pageViews) {
    const sessionId = random.uuid()
    const userId = sessionIndex < 3 ? fixedCustomer.id : random.chance(0.3) ? random.pick(customers).id : null
    sessionIndex++
    let ms = recentMs()
    const length = random.int(1, 7)
    for (let k = 0; k < length && pageViews.length < config.pageViews; k++) {
      const roll = random.next()
      let productId: string | null = null
      let pagePath: string
      if (k === 0) pagePath = roll < 0.5 ? '/' : roll < 0.7 ? '/catalog' : '__product'
      else pagePath = roll < 0.55 ? '__product' : roll < 0.75 ? `/catalog${categories.length ? `?category=${random.pick(categories).slug}` : ''}` : roll < 0.9 ? '/cart' : '/checkout'
      if (pagePath === '__product') {
        if (visible.length === 0) pagePath = '/catalog'
        else {
          const product = random.pick(visible)
          productId = product.id
          pagePath = `/catalog/${product.slug}`
        }
      }
      pageViews.push({ sessionId, userId, path: pagePath, productId, viewedAt: iso(Math.min(ms, NOW - MINUTE)) })
      ms += random.int(20, 180) * 1000
    }
  }
  pageViews.sort((a, b) => b.viewedAt.localeCompare(a.viewedAt))
  for (const view of pageViews) if (view.productId) productById.get(view.productId)!.viewCount++

  const cartAddEvents: DemoCartAddEvent[] = [
    ...carts.map((c) => ({ userId: c.userId, productId: c.productId, createdAt: c.addedAt })),
    ...orders.flatMap((o) => o.items.map((item) => ({ userId: o.userId, productId: item.productId, createdAt: iso(Date.parse(o.createdAt) - random.int(5, 90) * MINUTE) }))),
  ]

  // Vendidos nos últimos 30 dias (pedidos pagos)
  for (const order of orders) {
    if (order.paymentStatus !== 'PAID' || Date.parse(order.createdAt) < NOW - 30 * DAY) continue
    for (const item of order.items) productById.get(item.productId)!.soldQuantityLast30Days += item.quantity
  }

  // Site
  const settings: SiteSettings = {
    placeholderImageUrl: '/demo/images/site/placeholder.svg',
    faviconUrl: '/demo/images/site/favicon.svg',
    logoUrl: '/demo/images/site/logo.svg',
    siteTitle: WORDS.site.siteTitle,
    defaultDescription: WORDS.site.defaultDescription,
    aboutUsContent: WORDS.site.aboutUsContent,
    contactDescription: WORDS.site.contactDescription,
    contactPhone: WORDS.site.contactPhone,
    contactEmail: WORDS.site.contactEmail,
    instagramUrl: 'https://www.instagram.com/',
    tiktokUrl: 'https://www.tiktok.com/',
    facebookUrl: 'https://www.facebook.com/',
    privacyPolicyContent: WORDS.site.privacyPolicyContent,
    termsContent: WORDS.site.termsContent,
    refundPolicyContent: WORDS.site.refundPolicyContent,
    fiscalCompanyCnpj: cnpjFrom(random),
    fiscalCompanyLegalName: WORDS.site.fiscalCompanyLegalName,
    fiscalCompanyTradeName: WORDS.site.fiscalCompanyTradeName,
    fiscalCompanyStateRegistration: `${random.digits(3)}.${random.digits(3)}.${random.digits(3)}.${random.digits(3)}`,
    fiscalCompanyTaxRegime: 'SIMPLES_NACIONAL',
    fiscalCompanyStreet: WORDS.site.fiscalCompanyStreet,
    fiscalCompanyNumber: WORDS.site.fiscalCompanyNumber,
    fiscalCompanyNeighborhood: WORDS.site.fiscalCompanyNeighborhood,
    fiscalCompanyCity: WORDS.site.fiscalCompanyCity,
    fiscalCompanyState: WORDS.site.fiscalCompanyState,
    fiscalCompanyZipCode: WORDS.site.fiscalCompanyZipCode,
    fiscalCompanyEmail: WORDS.site.fiscalCompanyEmail,
    fiscalCompanyPhone: WORDS.site.fiscalCompanyPhone,
    pixKey: WORDS.site.pixKey,
    pixKeyHolder: WORDS.site.pixKeyHolder,
    pixQrCodeUrl: null,
  }
  images['site/logo.svg'] = logoSvg(WORDS.site.siteTitle)
  images['site/favicon.svg'] = faviconSvg()
  images['site/placeholder.svg'] = placeholderSvg()

  const banners: Banner[] = Array.from({ length: config.banners }, (_, i) => {
    const seed = WORDS.banners[i % WORDS.banners.length]
    const file = `banners/banner-${i + 1}.svg`
    images[file] = bannerSvg(seed.title, seed.subtitle, i, categorySeeds.map((c) => c.shape))
    return { id: random.uuid(), imageUrl: `/demo/images/${file}`, linkUrl: seed.link, position: i }
  })

  const navItems = buildNavItems(config.navItems, categories, random)

  // Ordenações finais (as listagens do painel mostram o mais recente primeiro)
  orders.reverse()
  users.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const data: DemoData = {
    generatedAt: now.toISOString(),
    config,
    fixedAccounts: { customer: FIXED_ACCOUNTS.customer.email, employee: FIXED_ACCOUNTS.employee.email, admin: FIXED_ACCOUNTS.admin.email },
    settings,
    paymentGateway: {
      active: 'STRIPE',
      available: [
        { provider: 'MANUAL', configured: true },
        { provider: 'STRIPE', configured: true },
        { provider: 'PAGSEGURO', configured: false },
      ],
    },
    paymentMethods: {
      DELIVERY: ['PIX', 'CREDIT_CARD', 'BOLETO'],
      PICKUP: activeCenters.length > 0 ? ['PIX', 'CREDIT_CARD', 'PAY_ON_PICKUP'] : [],
    },
    melhorEnvioConnected: true,
    categories,
    products,
    users,
    addresses,
    distributionCenters,
    promotions,
    coupons,
    couponRedemptions,
    orders,
    orderChangeRequests,
    reviews,
    wishlist,
    carts,
    stockLots,
    stockMovements,
    banners,
    navItems,
    notifications,
    auditLogs,
    pageViews,
    cartAddEvents,
  }
  return { data, images }
}

function stripUserId(address: DemoAddress): Address {
  const copy: Partial<DemoAddress> = { ...address }
  delete copy.userId
  return copy as Address
}

export function couponStatus(coupon: Coupon, nowMs: number): CouponStatus {
  if (!coupon.active) return 'INACTIVE'
  if (coupon.startsAt && Date.parse(coupon.startsAt) > nowMs) return 'SCHEDULED'
  if (coupon.endsAt && Date.parse(coupon.endsAt) < nowMs) return 'EXPIRED'
  if (coupon.maxUses !== null && coupon.usesCount >= coupon.maxUses) return 'EXHAUSTED'
  return 'ACTIVE'
}

function buildNavItems(total: number, categories: Category[], random: Random): SiteNavItem[] {
  const top = (label: string, url: string, placement: SiteNavItem['placement']): SiteNavItem => ({
    id: random.uuid(),
    type: 'LINK',
    label,
    url,
    placement,
    position: 0,
  })
  const collection: SiteNavItem = { id: random.uuid(), type: 'COLLECTION', label: 'Categorias', placement: 'BOTH', position: 0, children: [] }
  const children = categories.map((c, k) => ({ id: random.uuid(), type: 'LINK' as const, label: c.name, url: `/catalog?category=${c.slug}`, placement: null, position: k }))

  type Slot = { kind: 'top'; item: SiteNavItem } | { kind: 'child' }
  const slots: Slot[] = [
    { kind: 'top', item: top('Novidades', '/catalog?sort=NEWEST', 'NAVBAR') },
    { kind: 'top', item: top('Promoções', '/catalog?onSale=true', 'NAVBAR') },
    { kind: 'top', item: collection },
    { kind: 'top', item: top('Sobre nós', '/about-us', 'FOOTER') },
    { kind: 'top', item: top('Contato', '/contact', 'FOOTER') },
    ...children.slice(0, 3).map(() => ({ kind: 'child' as const })),
    { kind: 'top', item: top('Trocas e devoluções', '/refund-policy', 'FOOTER') },
    { kind: 'top', item: top('Privacidade', '/privacy-policy', 'FOOTER') },
    { kind: 'top', item: top('Termos de uso', '/terms-and-conditions', 'FOOTER') },
    ...children.slice(3).map(() => ({ kind: 'child' as const })),
    { kind: 'top', item: top('Catálogo completo', '/catalog', 'BOTH') },
    { kind: 'top', item: top('Mais vendidos', '/catalog', 'NAVBAR') },
    { kind: 'top', item: top('Carrinho', '/cart', 'FOOTER') },
    { kind: 'top', item: top('Meus pedidos', '/orders', 'FOOTER') },
  ]
  const result: SiteNavItem[] = []
  for (const slot of slots.slice(0, total)) {
    if (slot.kind === 'top') result.push(slot.item)
    else collection.children!.push(children[collection.children!.length])
  }
  result.forEach((item, k) => (item.position = k))
  return result
}

// ── Imagens SVG ─────────────────────────────────────────────────────────────

type Shape = 'tshirt' | 'shirt' | 'dress' | 'skirt' | 'pants' | 'shorts' | 'sneaker' | 'sandal' | 'bag' | 'backpack' | 'cap' | 'glasses'

const BACKGROUNDS = ['#f3efe8', '#ece8f3', '#e8f0ef', '#f4ece6', '#eef1e6', '#f1e9ec']
const OUTLINE = '#00000026'

const escapeXml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** A peça desenhada numa caixa de 200 × 200. */
function shapeMarkup(shape: Shape, color: string): string {
  const fill = `fill="${color}" stroke="${OUTLINE}" stroke-width="2" stroke-linejoin="round"`
  const detail = 'fill="none" stroke="#00000033" stroke-width="2" stroke-linecap="round"'
  switch (shape) {
    case 'tshirt':
      return `<path ${fill} d="M60 22 L84 12 Q100 30 116 12 L140 22 L182 54 L160 84 L140 72 L140 190 L60 190 L60 72 L40 84 L18 54 Z"/><path ${detail} d="M84 12 Q100 30 116 12"/>`
    case 'shirt':
      return `<path ${fill} d="M62 20 L86 10 L100 32 L114 10 L138 20 L176 150 L156 156 L140 84 L140 192 L60 192 L60 84 L44 156 L24 150 Z"/><path ${detail} d="M86 10 L100 32 L114 10 M100 32 L100 190"/><g fill="#ffffff99">${[56, 88, 120, 152].map((y) => `<circle cx="106" cy="${y}" r="3"/>`).join('')}</g>`
    case 'dress':
      return `<path ${fill} d="M82 12 L90 12 L94 38 L106 38 L110 12 L118 12 L120 44 Q136 58 128 84 L176 190 L24 190 L72 84 Q64 58 80 44 Z"/><path ${detail} d="M72 84 Q100 94 128 84"/>`
    case 'skirt':
      return `<path ${fill} d="M64 40 L136 40 L138 58 L182 182 L18 182 L62 58 Z"/><path ${detail} d="M62 58 L138 58 M80 60 L62 180 M100 60 L100 180 M120 60 L138 180"/>`
    case 'pants':
      return `<path ${fill} d="M58 14 L142 14 L150 192 L112 192 L100 70 L88 192 L50 192 Z"/><path ${detail} d="M58 30 L142 30 M100 30 L100 70"/>`
    case 'shorts':
      return `<path ${fill} d="M54 44 L146 44 L158 146 L110 150 L100 98 L90 150 L42 146 Z"/><path ${detail} d="M54 60 L146 60 M100 60 L100 98"/>`
    case 'sneaker':
      return `<path ${fill} d="M20 122 Q24 82 62 86 L96 96 Q122 70 152 100 L182 116 Q192 132 182 140 L24 140 Q14 134 20 122 Z"/><path fill="#fafafa" stroke="${OUTLINE}" stroke-width="2" d="M16 140 L186 140 L186 152 Q100 162 16 152 Z"/><path ${detail} d="M104 94 L118 108 M114 88 L128 102 M124 84 L138 98"/>`
    case 'sandal':
      return `<path fill="#e9dcc8" stroke="${OUTLINE}" stroke-width="2" d="M18 140 Q100 124 186 134 L186 150 Q100 162 18 154 Z"/><path fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round" d="M48 140 Q70 92 98 136 M110 134 Q132 96 156 132"/>`
    case 'bag':
      return `<path fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round" d="M70 82 Q70 30 100 30 Q130 30 130 82"/><path ${fill} d="M34 80 L166 80 L176 190 L24 190 Z"/><path ${detail} d="M34 104 L166 104"/>`
    case 'backpack':
      return `<path fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" d="M86 30 Q100 12 114 30"/><path ${fill} d="M50 52 Q50 26 100 26 Q150 26 150 52 L156 186 Q100 196 44 186 Z"/><path ${fill} d="M68 120 L132 120 L134 172 L66 172 Z"/><path ${detail} d="M68 136 L132 136"/>`
    case 'cap':
      return `<path ${fill} d="M38 122 Q38 50 100 50 Q162 50 162 122 Z"/><path ${fill} d="M96 116 Q172 106 192 132 Q142 144 96 130 Z"/><circle cx="100" cy="52" r="5" fill="${color}" stroke="${OUTLINE}"/><path ${detail} d="M100 52 L100 122 M68 60 Q60 90 62 122 M132 60 Q140 90 138 122"/>`
    case 'glasses':
      return `<path fill="none" stroke="#2b2b2b" stroke-width="6" stroke-linecap="round" d="M22 100 L8 92 M178 100 L192 92 M86 104 Q100 92 114 104"/><circle cx="56" cy="110" r="34" fill="${color}" fill-opacity="0.85" stroke="#2b2b2b" stroke-width="6"/><circle cx="144" cy="110" r="34" fill="${color}" fill-opacity="0.85" stroke="#2b2b2b" stroke-width="6"/><path fill="none" stroke="#ffffff88" stroke-width="5" stroke-linecap="round" d="M40 98 Q46 88 56 86 M128 98 Q134 88 144 86"/>`
  }
}

function productSvg(shape: Shape, color: string, index: number, detail: boolean): string {
  const background = BACKGROUNDS[(index + (detail ? 3 : 0)) % BACKGROUNDS.length]
  const transform = detail ? 'translate(-60 -40) scale(3.6)' : 'translate(60 150) scale(2.4)'
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">` +
    `<rect width="600" height="800" fill="${background}"/>` +
    (detail ? '' : `<ellipse cx="300" cy="640" rx="200" ry="22" fill="#0000000f"/>`) +
    `<g transform="${transform}">${shapeMarkup(shape, color)}</g>` +
    `</svg>`
  )
}

const BANNER_GRADIENTS = [
  ['#1f3a5f', '#8fb8de'],
  ['#6d1f2f', '#e8a0b4'],
  ['#6b7041', '#d9c3a0'],
  ['#c0583a', '#d4a017'],
  ['#3d2c5c', '#b39ddb'],
  ['#1f1f1f', '#9a9a9a'],
]

function bannerSvg(title: string, subtitle: string, index: number, shapes: Shape[]): string {
  const [from, to] = BANNER_GRADIENTS[index % BANNER_GRADIENTS.length]
  const pool: Shape[] = shapes.length > 0 ? shapes : ['tshirt', 'dress', 'sneaker']
  const pieces = [0, 1, 2]
    .map((k) => {
      const shape = pool[(index + k) % pool.length]
      return `<g transform="translate(${930 + k * 210} ${110 + (k % 2) * 40}) scale(1.35)">${shapeMarkup(shape, '#ffffffe6')}</g>`
    })
    .join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 500" width="1600" height="500">` +
    `<defs><linearGradient id="g${index}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>` +
    `<rect width="1600" height="500" fill="url(#g${index})"/>` +
    `<circle cx="1240" cy="250" r="230" fill="#ffffff14"/>` +
    pieces +
    `<g font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" fill="#ffffff">` +
    `<text x="110" y="220" font-size="92" font-weight="700">${escapeXml(title)}</text>` +
    `<text x="112" y="290" font-size="40" fill-opacity="0.9">${escapeXml(subtitle)}</text>` +
    `<rect x="110" y="340" width="270" height="68" rx="34" fill="#ffffff"/>` +
    `<text x="245" y="384" font-size="28" font-weight="600" text-anchor="middle" fill="${from}">Ver coleção</text>` +
    `</g></svg>`
  )
}

const HANGER = '<path fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" d="M50 22 Q50 10 60 10 Q70 10 70 20 Q70 28 60 32 L60 40 L18 72 Q12 78 20 78 L100 78 Q108 78 102 72 L60 40"/>'

function logoSvg(title: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 90" width="360" height="90">` +
    `<g color="#1f3a5f" transform="translate(4 2)">${HANGER}</g>` +
    `<text x="128" y="60" font-family="Georgia, 'Times New Roman', serif" font-size="38" font-weight="700" fill="#1f3a5f">${escapeXml(title)}</text>` +
    `</svg>`
  )
}

function faviconSvg(): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">` +
    `<rect width="64" height="64" rx="14" fill="#1f3a5f"/>` +
    `<text x="32" y="45" font-family="Georgia, 'Times New Roman', serif" font-size="38" font-weight="700" text-anchor="middle" fill="#ffffff">V</text>` +
    `</svg>`
  )
}

function placeholderSvg(): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">` +
    `<rect width="600" height="800" fill="#eeeeec"/>` +
    `<g color="#b5b5b0" transform="translate(180 260) scale(2)">${HANGER}</g>` +
    `<text x="300" y="500" font-family="system-ui, sans-serif" font-size="30" text-anchor="middle" fill="#8a8a85">Imagem indisponível</text>` +
    `</svg>`
  )
}

// ── Execução direta ─────────────────────────────────────────────────────────

const DEMO_DIR = path.resolve(GENERATOR_DIR, '..')
const ROOT_DIR = path.resolve(DEMO_DIR, '..')

function main(args: string[]) {
  const configPath = path.resolve(args[0] ?? path.join(DEMO_DIR, 'data.config.json'))
  const outputPath = path.resolve(args[1] ?? path.join(DEMO_DIR, 'data.json'))
  const imagesDir = path.join(ROOT_DIR, 'public', 'demo', 'images')

  const config = validateConfig(JSON.parse(readFileSync(configPath, 'utf8')))
  const { data, images } = generate(config, { now: new Date() })

  writeFileSync(outputPath, `${JSON.stringify(data, null, 1)}\n`)
  rmSync(imagesDir, { recursive: true, force: true })
  for (const [file, svg] of Object.entries(images)) {
    const target = path.join(imagesDir, file)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, `${svg}\n`)
  }
  writeFileSync(path.join(DEMO_DIR, 'data.config.schema.json'), `${JSON.stringify(buildConfigSchema(), null, 2)}\n`)

  const count = (list: unknown[]) => String(list.length).padStart(6)
  console.log(`demo/data.json gerado (${data.generatedAt})`)
  console.log(`${count(data.products)} produtos    ${count(data.users)} usuários   ${count(data.orders)} pedidos`)
  console.log(`${count(data.reviews)} avaliações  ${count(data.stockMovements)} mov. estoque ${count(data.pageViews)} visitas`)
  console.log(`${count(Object.keys(images))} imagens em public/demo/images/`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
