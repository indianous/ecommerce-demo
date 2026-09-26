import type { NextRequest } from 'next/server'
import { proxyJson } from '@/lib/api-proxy'
import { forwardedForHeader } from '@/lib/client-ip'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

/** Sempre 204 no backend, exista ou não a conta. O IP vai junto para o rate limit. */
export async function POST(req: NextRequest) {
  const body = await req.json()

  const res = await fetch(`${API}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...forwardedForHeader(req.headers) },
    body: JSON.stringify(body),
  })

  return proxyJson(res)
}
