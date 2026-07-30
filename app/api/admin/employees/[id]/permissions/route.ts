import { NextRequest, NextResponse } from 'next/server'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = request.headers.get('Authorization')
  const { id } = await params

  const res = await fetch(`${API}/admin/employees/${id}/permissions`, {
    headers: { ...(authorization ? { Authorization: authorization } : {}) },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = request.headers.get('Authorization')
  const { id } = await params
  const body = await request.json()

  const res = await fetch(`${API}/admin/employees/${id}/permissions`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
