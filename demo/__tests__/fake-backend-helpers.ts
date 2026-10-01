import { generate, validateConfig, FIXED_ACCOUNTS, type DemoData } from '../generator/generate'
import { handle } from '../fake-backend/handler'
import type { DemoResponse } from '../fake-backend/types'

/** Momento da geração dos dados de teste. */
export const GENERATED_AT = new Date('2026-09-01T12:00:00Z')

export const smallConfig = validateConfig({
  seed: 7,
  categories: 4,
  products: 24,
  customers: 8,
  employees: 2,
  admins: 1,
  orders: 60,
  reviews: 30,
  orderChangeRequests: 4,
  wishlistItems: 12,
  cartItems: 6,
  coupons: 6,
  couponRedemptions: 10,
  promotions: 3,
  stockMovements: 80,
  distributionCenters: 2,
  banners: 2,
  navItems: 6,
  notifications: 12,
  auditLogs: 40,
  pageViews: 300,
})

export const data: DemoData = generate(smallConfig, { now: GENERATED_AT }).data

export const userByEmail = (email: string) => data.users.find((u) => u.email === email)!
export const fixedCustomer = () => userByEmail(FIXED_ACCOUNTS.customer.email)
export const fixedEmployee = () => userByEmail(FIXED_ACCOUNTS.employee.email)
export const fixedAdmin = () => userByEmail(FIXED_ACCOUNTS.admin.email)

/** Token de acesso como o backend falso emite. */
export const tokenFor = (userId: string) => `demo.${userId}.teste`

interface CallOptions {
  token?: string
  body?: unknown
  contentType?: string
  /** "Agora" da requisição; por padrão, o próprio momento da geração (sem deslocamento de datas). */
  now?: Date
}

export function call(method: string, url: string, options: CallOptions = {}): DemoResponse {
  const parsed = new URL(url, 'http://demo.local')
  const headers: Record<string, string> = {}
  if (options.token) headers.authorization = `Bearer ${options.token}`
  if (options.contentType) headers['content-type'] = options.contentType
  else if (options.body !== undefined) headers['content-type'] = 'application/json'
  return handle(
    { method, path: parsed.pathname, query: parsed.searchParams, headers, body: options.body },
    data,
    (options.now ?? GENERATED_AT).getTime(),
  )
}

export const asCustomer = { token: tokenFor(data.users.find((u) => u.email === FIXED_ACCOUNTS.customer.email)!.id) }
export const asEmployee = { token: tokenFor(data.users.find((u) => u.email === FIXED_ACCOUNTS.employee.email)!.id) }
export const asAdmin = { token: tokenFor(data.users.find((u) => u.email === FIXED_ACCOUNTS.admin.email)!.id) }

/** Corpo da resposta já tipado para o teste. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const body = (response: DemoResponse) => response.body as any
