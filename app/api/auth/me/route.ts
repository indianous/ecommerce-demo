import { NextRequest, NextResponse } from 'next/server'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function GET(request: NextRequest) {
  const authorization = request.headers.get('Authorization')

  const res = await fetch(`${API}/users/me`, {
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
    },
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function PATCH(request: NextRequest) {
  const authorization = request.headers.get('Authorization')
  const body = await request.json()

  const res = await fetch(`${API}/users/me`, {
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
