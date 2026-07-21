import { NextRequest } from 'next/server'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = request.headers.get('Authorization')
  const { id } = await params

  const res = await fetch(`${API}/admin/employees/${id}`, {
    method: 'DELETE',
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
    },
  })

  if (res.status === 204) {
    return new Response(null, { status: 204 })
  }

  const data = await res.json()
  return Response.json(data, { status: res.status })
}
