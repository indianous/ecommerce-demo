import type { NextRequest } from 'next/server'
import { proxyJson } from '@/lib/api-proxy'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authorization = req.headers.get('Authorization')

  const res = await fetch(`${API}/admin/users/${id}/password-invite`, {
    method: 'POST',
    headers: { ...(authorization ? { Authorization: authorization } : {}) },
  })

  return proxyJson(res)
}
