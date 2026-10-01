import type { DemoData, DemoUser } from '../generator/generate'

/** Requisição já separada do Next, para os testes chamarem o handler direto. */
export interface DemoRequest {
  method: string
  /** Caminho depois de `/api/v1`, ex.: `/catalog/products`. */
  path: string
  query: URLSearchParams
  /** Nomes em minúsculas. */
  headers: Record<string, string>
  /** JSON já lido; `undefined` em multipart ou sem corpo. */
  body?: unknown
}

export interface DemoResponse {
  status: number
  /** Corpo JSON. Ausente em 204 e nas respostas sem corpo (401 do filtro). */
  body?: unknown
  /** Corpo em texto puro (CSV). */
  text?: string
  headers?: Record<string, string>
}

export interface Context {
  req: DemoRequest
  params: Record<string, string>
  query: URLSearchParams
  user: DemoUser | null
  /** Dados com as datas já deslocadas para hoje. */
  data: DemoData
  now: number
}

export type Access = 'public' | 'auth' | 'staff' | 'admin'

export interface Route {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  pattern: string
  handler: (ctx: Context) => DemoResponse
}

export const ok = (body: unknown): DemoResponse => ({ status: 200, body })
export const created = (body: unknown): DemoResponse => ({ status: 201, body })
export const noContent = (): DemoResponse => ({ status: 204 })
export const notFound = (message = 'Recurso não encontrado na demonstração.'): DemoResponse => ({ status: 404, body: { message, status: 404 } })
export const badRequest = (message: string): DemoResponse => ({ status: 400, body: { message, status: 400 } })

/** Corpo da requisição como objeto (vazio quando não é JSON). */
export function bodyOf(ctx: Context): Record<string, unknown> {
  const body = ctx.req.body
  return typeof body === 'object' && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : {}
}
