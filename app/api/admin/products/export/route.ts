import { NextRequest } from 'next/server'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function GET(request: NextRequest) {
  const authorization = request.headers.get('Authorization')

  const res = await fetch(`${API}/admin/products/export`, {
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
    },
  })

  return new Response(res.body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'text/csv',
      'Content-Disposition': res.headers.get('Content-Disposition') ?? 'attachment; filename="produtos.csv"',
    },
  })
}
