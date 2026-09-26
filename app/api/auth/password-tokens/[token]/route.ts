import type { NextRequest } from 'next/server'
import { proxyJson } from '@/lib/api-proxy'
import { forwardedForHeader } from '@/lib/client-ip'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const res = await fetch(`${API}/auth/password-tokens/${encodeURIComponent(token)}`, {
    headers: { ...forwardedForHeader(req.headers) },
  })

  return proxyJson(res)
}
