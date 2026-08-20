const SESSION_KEY = 'page_view_session_id'

/** Um id por aba/sessão de navegador, usado para agrupar page views de uma mesma visita. */
export function getOrCreateSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}
