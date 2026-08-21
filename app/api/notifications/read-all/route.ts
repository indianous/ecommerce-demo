import { NextRequest, NextResponse } from 'next/server'
import { proxyJson } from '@/lib/api-proxy'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function PATCH(request: NextRequest) {
  const authorization = request.headers.get('Authorization')

  const res = await fetch(`${API}/notifications/read-all`, {
    method: 'PATCH',
    headers: { ...(authorization ? { Authorization: authorization } : {}) },
  })

  if (res.status === 204) {
    return new NextResponse(null, { status: 204 })
  }

  return proxyJson(res)
}
