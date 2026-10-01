/**
 * Backend falso da demo: responde nas mesmas rotas de `/api/v1` do backend real, a partir de `demo/data.json`,
 * sem alterar nada. O BFF chega aqui porque `API_INTERNAL_URL` aponta para `/demo-backend/api/v1`.
 *
 * Arquivo exclusivo do repositório ecommerce-demo (não existe no original).
 */
import { NextRequest } from 'next/server'
import rawData from '@/demo/data.json'
import { handle } from '@/demo/fake-backend/handler'
import type { DemoData } from '@/demo/generator/generate'

const data = rawData as unknown as DemoData

type RouteContext = { params: Promise<{ path: string[] }> }

async function readBody(request: NextRequest): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? ''
  // Upload: o arquivo não é lido, o backend falso só devolve a URL de uma imagem existente.
  if (contentType.includes('multipart/form-data')) return undefined
  const text = await request.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function respond(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { path } = await params
  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value
  })

  const result = handle(
    { method: request.method, path: `/${path.join('/')}`, query: request.nextUrl.searchParams, headers, body: await readBody(request) },
    data,
  )

  if (result.text !== undefined) return new Response(result.text, { status: result.status, headers: result.headers })
  if (result.body === undefined) return new Response(null, { status: result.status, headers: result.headers })
  return Response.json(result.body, { status: result.status, headers: result.headers })
}

export const GET = respond
export const POST = respond
export const PUT = respond
export const PATCH = respond
export const DELETE = respond
