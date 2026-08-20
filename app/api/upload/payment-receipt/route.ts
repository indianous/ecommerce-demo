import { NextRequest } from 'next/server'
import { proxyJson } from '@/lib/api-proxy'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('Authorization')
  const formData = await request.formData()

  const res = await fetch(`${API}/upload/receipt`, {
    method: 'POST',
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: formData,
  })

  return proxyJson(res)
}
