import { useAuthStore } from '@/stores/auth.store'

let pendingRefresh: Promise<string | null> | null = null

function getFreshToken(): Promise<string | null> {
  if (!pendingRefresh) {
    pendingRefresh = useAuthStore.getState().refreshAccessToken().finally(() => {
      pendingRefresh = null
    })
  }
  return pendingRefresh
}

function redirectToLogin() {
  const path = window.location.pathname + window.location.search
  window.location.href = `/login?callbackUrl=${encodeURIComponent(path)}&sessionExpired=1`
}

function withAuthHeader(init: RequestInit, token: string | null): RequestInit {
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return { ...init, headers }
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const accessToken = useAuthStore.getState().accessToken
  const res = await fetch(input, withAuthHeader(init, accessToken))

  if (res.status !== 401) return res

  const newToken = await getFreshToken()
  if (!newToken) {
    redirectToLogin()
    return new Promise<Response>(() => {})
  }

  const retryRes = await fetch(input, withAuthHeader(init, newToken))
  if (retryRes.status === 401) {
    redirectToLogin()
    return new Promise<Response>(() => {})
  }
  return retryRes
}
