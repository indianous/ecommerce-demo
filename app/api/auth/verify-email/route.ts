import type { NextRequest } from 'next/server'
import { proxyJson } from '@/lib/api-proxy'
import { forwardedForHeader } from '@/lib/client-ip'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

/** Não exige login: o link pode ser aberto em outro aparelho. */
export async function POST(req: NextRequest) {
  const body = await req.json()

  const res = await fetch(`${API}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...forwardedForHeader(req.headers) },
    body: JSON.stringify(body),
  })

  return proxyJson(res)
}
