import { NextRequest } from 'next/server'
import { proxyJson } from '@/lib/api-proxy'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function GET(request: NextRequest) {
  const authorization = request.headers.get('Authorization')
  const { searchParams } = new URL(request.url)

  const query = searchParams.toString()
  const url = `${API}/admin/analytics/channels${query ? `?${query}` : ''}`

  const res = await fetch(url, {
    headers: { ...(authorization ? { Authorization: authorization } : {}) },
  })
  return proxyJson(res)
}
