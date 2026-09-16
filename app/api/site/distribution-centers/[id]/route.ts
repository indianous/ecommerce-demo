import type { NextRequest } from 'next/server'
import { proxyJson } from '@/lib/api-proxy'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const authorization = request.headers.get('Authorization')
  const body = await request.json()

  const res = await fetch(`${API}/site/distribution-centers/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify(body),
  })

  return proxyJson(res)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const authorization = request.headers.get('Authorization')

  const res = await fetch(`${API}/site/distribution-centers/${id}`, {
    method: 'DELETE',
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
    },
  })

  if (res.status === 204) return new Response(null, { status: 204 })

  return proxyJson(res)
}
