import { NextResponse } from 'next/server'
import { proxyJson } from '@/lib/api-proxy'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const res = await fetch(`${API}/catalog/products/${id}/views`, {
    method: 'POST',
  })

  if (res.status === 204) {
    return new NextResponse(null, { status: 204 })
  }

  return proxyJson(res)
}
