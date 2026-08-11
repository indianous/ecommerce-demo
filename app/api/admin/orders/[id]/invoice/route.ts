import { NextRequest, NextResponse } from 'next/server'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const authorization = request.headers.get('Authorization')

  const res = await fetch(`${API}/admin/orders/${id}/invoice`, {
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
    },
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const authorization = request.headers.get('Authorization')

  const res = await fetch(`${API}/admin/orders/${id}/invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
    },
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
