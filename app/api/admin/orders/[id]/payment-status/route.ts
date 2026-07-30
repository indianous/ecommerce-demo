import { NextRequest, NextResponse } from 'next/server'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = request.headers.get('Authorization')
  const { id } = await params
  const body = await request.json()

  const res = await fetch(`${API}/admin/orders/${id}/payment-status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
