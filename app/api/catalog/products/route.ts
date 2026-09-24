import type { NextRequest } from 'next/server'
import { proxyJson } from '@/lib/api-proxy'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

/** Catálogo público (só produtos ativos e disponíveis). Usado pela busca de produtos do pedido manual. */
export async function GET(request: NextRequest) {
  const query = new URL(request.url).searchParams.toString()
  const res = await fetch(`${API}/catalog/products${query ? `?${query}` : ''}`)
  return proxyJson(res)
}
