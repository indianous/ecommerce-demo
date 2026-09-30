// Mesma regra do backend (SafeUrls, plano 74): links que viram href só podem ser http(s) com host ou um caminho
// da própria loja. O backend recusa com 400 o que não passar aqui; a validação no formulário só antecipa o erro.

export function isAbsoluteHttpUrl(value: string): boolean {
  const url = value.trim()
  if (/[\s\\]/.test(url)) return false
  try {
    const parsed = new URL(url)
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname !== '' && /^https?:\/\/[^/]/i.test(url)
  } catch {
    return false
  }
}

/** Vazio passa (campos opcionais). Caminho relativo só com uma barra: "//host" é protocolo-relativo. */
export function isSafeLink(value: string): boolean {
  const url = value.trim()
  if (url === '') return true
  if (url.startsWith('/')) return !url.startsWith('//') && !/[\s\\]/.test(url)
  return isAbsoluteHttpUrl(url)
}
