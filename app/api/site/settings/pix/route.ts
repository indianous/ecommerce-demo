import { NextRequest } from 'next/server'
import { proxyJson } from '@/lib/api-proxy'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function PUT(request: NextRequest) {
  const authorization = request.headers.get('Authorization')
  const body = await request.json()

  const res = await fetch(`${API}/site/settings/pix`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify(body),
  })

  return proxyJson(res)
}
