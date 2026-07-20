import type { NextRequest } from 'next/server'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

// There is no GET /admin/products on the backend (AdminProductController only
// has POST/PUT/DELETE) — reuse the public catalog listing instead, requesting
// a large page so the management table sees everything in one shot.
export async function GET(request: NextRequest) {
  const authorization = request.headers.get('Authorization')

  const res = await fetch(`${API}/catalog/products?size=200`, {
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
    },
  })

  const data = await res.json()
  if (!res.ok) return Response.json(data, { status: res.status })
  return Response.json(data.content ?? [])
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('Authorization')
  const body = await request.json()

  const res = await fetch(`${API}/admin/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return Response.json(data, { status: res.status })
}
