import { useAuthStore } from '@/stores/auth.store'

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

  // O store deduplica refreshes simultâneos
  const newToken = await useAuthStore.getState().refreshAccessToken()
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
