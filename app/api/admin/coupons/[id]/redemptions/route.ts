import type { NextRequest } from 'next/server'
import { proxyJson } from '@/lib/api-proxy'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authorization = request.headers.get('Authorization')
  const query = new URL(request.url).searchParams.toString()

  const res = await fetch(`${API}/admin/coupons/${id}/redemptions${query ? `?${query}` : ''}`, {
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
    },
  })

  return proxyJson(res)
}
