import { NextResponse } from 'next/server'

/**
 * Faz parse seguro do corpo de uma resposta HTTP. Respostas sem corpo
 * (ex.: 401/403 rejeitados pelo filtro do Spring Security, que nunca
 * passam pelo GlobalExceptionHandler e não têm JSON) retornam null em
 * vez de lançar SyntaxError.
 */
export async function safeJson<T = unknown>(res: Response): Promise<T | null> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

/** Repassa a resposta de uma chamada upstream como NextResponse, com parse seguro de JSON. */
export async function proxyJson(res: Response): Promise<NextResponse> {
  if (res.status === 204) {
    return new NextResponse(null, { status: 204 })
  }
  const data = await safeJson(res)
  return NextResponse.json(data, { status: res.status })
}
