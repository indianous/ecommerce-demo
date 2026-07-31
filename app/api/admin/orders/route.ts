import type { NextRequest } from 'next/server'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function GET(request: NextRequest) {
  const authorization = request.headers.get('Authorization')
  const { searchParams } = new URL(request.url)

  const res = await fetch(`${API}/admin/orders?${searchParams.toString()}`, {
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
    },
  })

  const data = await res.json()
  return Response.json(data, { status: res.status })
}
