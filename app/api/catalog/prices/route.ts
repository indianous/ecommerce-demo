import type { NextRequest } from 'next/server'
import { proxyJson } from '@/lib/api-proxy'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

/** Preços atuais de produtos (público), para revalidar o carrinho de visitante. */
export async function POST(request: NextRequest) {
  const body = await request.json()

  const res = await fetch(`${API}/catalog/products/prices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  return proxyJson(res)
}
