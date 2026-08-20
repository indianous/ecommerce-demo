import { beforeEach, describe, expect, it } from 'vitest'
import { captureOnFirstVisit, readAttribution } from '@/lib/traffic-attribution'

function setLocation(pathname: string, search = '') {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, pathname, search },
    writable: true,
  })
}

describe('traffic-attribution', () => {
  beforeEach(() => {
    document.cookie = 'traffic_attribution=; path=/; max-age=0'
    Object.defineProperty(document, 'referrer', { value: '', configurable: true })
    setLocation('/', '')
  })

  it('captureOnFirstVisit(): grava utm_source/utm_medium/utm_campaign/referrer/landingPage a partir da URL', () => {
    Object.defineProperty(document, 'referrer', { value: 'https://google.com', configurable: true })
    setLocation('/catalog', '?utm_source=google&utm_medium=cpc&utm_campaign=black-friday')

    captureOnFirstVisit()

    expect(readAttribution()).toEqual({
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'black-friday',
      referrer: 'https://google.com',
      landingPage: '/catalog',
    })
  })

  it('captureOnFirstVisit(): sem UTM (acesso direto), ainda grava referrer/landingPage', () => {
    setLocation('/', '')

    captureOnFirstVisit()

    const attribution = readAttribution()
    expect(attribution.utmSource).toBeUndefined()
    expect(attribution.landingPage).toBe('/')
  })

  it('captureOnFirstVisit(): não sobrescreve um cookie já existente numa visita seguinte', () => {
    setLocation('/catalog', '?utm_source=google')
    captureOnFirstVisit()

    setLocation('/checkout', '?utm_source=facebook')
    captureOnFirstVisit()

    expect(readAttribution().utmSource).toBe('google')
    expect(readAttribution().landingPage).toBe('/catalog')
  })

  it('readAttribution(): sem cookie, retorna objeto vazio', () => {
    expect(readAttribution()).toEqual({})
  })
})
