import type { NextRequest } from 'next/server'
import { proxyJson } from '@/lib/api-proxy'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function POST(req: NextRequest) {
  const authorization = req.headers.get('Authorization')

  const res = await fetch(`${API}/auth/verify-email/resend`, {
    method: 'POST',
    headers: { ...(authorization ? { Authorization: authorization } : {}) },
  })

  return proxyJson(res)
}
