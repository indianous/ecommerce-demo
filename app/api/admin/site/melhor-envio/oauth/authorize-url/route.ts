import { NextRequest } from 'next/server'
import { proxyJson } from '@/lib/api-proxy'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function GET(request: NextRequest) {
  const authorization = request.headers.get('Authorization')

  const res = await fetch(`${API}/admin/site/melhor-envio/oauth/authorize-url`, {
    headers: { ...(authorization ? { Authorization: authorization } : {}) },
  })

  return proxyJson(res)
}
