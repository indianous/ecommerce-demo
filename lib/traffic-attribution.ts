const COOKIE_NAME = 'traffic_attribution'
const COOKIE_MAX_AGE_DAYS = 30

export interface TrafficAttribution {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  referrer?: string
  landingPage?: string
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

function writeCookie(name: string, value: string, maxAgeDays: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeDays * 24 * 60 * 60}`
}

/**
 * Grava a origem de tráfego (UTM/referrer/landing page) num cookie, só se
 * ainda não existir — modelo de atribuição "primeiro toque": preserva a
 * origem real do primeiro acesso, mesmo que o visitante volte depois por
 * um canal diferente antes de se cadastrar.
 */
export function captureOnFirstVisit(): void {
  if (readCookie(COOKIE_NAME)) return

  const params = new URLSearchParams(window.location.search)
  const attribution: TrafficAttribution = {
    utmSource: params.get('utm_source') || undefined,
    utmMedium: params.get('utm_medium') || undefined,
    utmCampaign: params.get('utm_campaign') || undefined,
    referrer: document.referrer || undefined,
    landingPage: window.location.pathname || undefined,
  }

  writeCookie(COOKIE_NAME, JSON.stringify(attribution), COOKIE_MAX_AGE_DAYS)
}

export function readAttribution(): TrafficAttribution {
  const raw = readCookie(COOKIE_NAME)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as TrafficAttribution
  } catch {
    return {}
  }
}
