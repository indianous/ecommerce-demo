import type { NextRequest } from 'next/server'
import { proxyJson } from '@/lib/api-proxy'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const authorization = request.headers.get('Authorization')
  const { searchParams } = new URL(request.url)

  const res = await fetch(`${API}/admin/products/${id}/stock-movements?${searchParams.toString()}`, {
    headers: { ...(authorization ? { Authorization: authorization } : {}) },
  })

  return proxyJson(res)
}
