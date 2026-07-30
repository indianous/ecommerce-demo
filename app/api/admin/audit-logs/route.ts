import type { NextRequest } from 'next/server'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function GET(request: NextRequest) {
  const authorization = request.headers.get('Authorization')
  const { searchParams } = new URL(request.url)

  const params = new URLSearchParams()
  const entityType = searchParams.get('entityType')
  const action = searchParams.get('action')
  const page = searchParams.get('page') ?? '0'
  const size = searchParams.get('size') ?? '20'

  if (entityType) params.set('entityType', entityType)
  if (action) params.set('action', action)
  params.set('page', page)
  params.set('size', size)
  params.set('sort', 'createdAt,desc')

  const res = await fetch(`${API}/admin/audit-logs?${params.toString()}`, {
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
    },
  })

  const data = await res.json()
  return Response.json(data, { status: res.status })
}
