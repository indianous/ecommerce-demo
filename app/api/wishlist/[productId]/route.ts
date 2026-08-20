import { NextRequest, NextResponse } from 'next/server'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params
  const authorization = request.headers.get('Authorization')

  const res = await fetch(`${API}/wishlist/${productId}`, {
    method: 'POST',
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
    },
  })

  if (res.status === 204) {
    return new NextResponse(null, { status: 204 })
  }

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params
  const authorization = request.headers.get('Authorization')

  const res = await fetch(`${API}/wishlist/${productId}`, {
    method: 'DELETE',
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
    },
  })

  if (res.status === 204) {
    return new NextResponse(null, { status: 204 })
  }

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
