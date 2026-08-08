import type { NextRequest } from 'next/server'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> },
) {
  const { id, reviewId } = await params
  const authorization = request.headers.get('Authorization')
  const body = await request.json()

  const res = await fetch(`${API}/products/${id}/reviews/${reviewId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return Response.json(data, { status: res.status })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> },
) {
  const { id, reviewId } = await params
  const authorization = request.headers.get('Authorization')

  const res = await fetch(`${API}/products/${id}/reviews/${reviewId}`, {
    method: 'DELETE',
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
    },
  })

  if (res.status === 204) return new Response(null, { status: 204 })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
