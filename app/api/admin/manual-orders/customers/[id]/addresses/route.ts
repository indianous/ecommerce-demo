import type { NextRequest } from 'next/server'
import { proxyJson } from '@/lib/api-proxy'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params
  const authorization = request.headers.get('Authorization')

  const res = await fetch(`${API}/admin/manual-orders/customers/${id}/addresses`, {
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
    },
  })

  return proxyJson(res)
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const authorization = request.headers.get('Authorization')
  const body = await request.json()

  const res = await fetch(`${API}/admin/manual-orders/customers/${id}/addresses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify(body),
  })

  return proxyJson(res)
}
