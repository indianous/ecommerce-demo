import type { NextRequest } from 'next/server'
import { proxyJson } from '@/lib/api-proxy'
import { forwardedForHeader } from '@/lib/client-ip'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

/** Não loga automaticamente: a troca encerra as sessões e o usuário entra de novo com a senha nova. */
export async function POST(req: NextRequest) {
  const body = await req.json()

  const res = await fetch(`${API}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...forwardedForHeader(req.headers) },
    body: JSON.stringify(body),
  })

  return proxyJson(res)
}
