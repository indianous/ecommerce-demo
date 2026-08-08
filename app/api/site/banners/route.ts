import { NextRequest } from 'next/server'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function GET() {
  const res = await fetch(`${API}/site/banners`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('Authorization')
  const formData = await request.formData()

  const res = await fetch(`${API}/site/banners`, {
    method: 'POST',
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: formData,
  })

  const data = await res.json()
  return Response.json(data, { status: res.status })
}
