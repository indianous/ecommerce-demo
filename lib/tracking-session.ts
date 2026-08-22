const SESSION_KEY = 'page_view_session_id'

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Um id por aba/sessão de navegador, usado para agrupar page views de uma mesma visita. */
export function getOrCreateSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = generateId()
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}
