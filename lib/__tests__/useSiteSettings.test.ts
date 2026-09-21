import { renderHook, waitFor, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSiteSettings } from '../useSiteSettings'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

describe('useSiteSettings', () => {
  it('começa carregando e expõe as configurações vindas de /api/site/settings', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ siteTitle: 'Loja' }))

    const { result } = renderHook(() => useSiteSettings())

    expect(result.current.loading).toBe(true)
    expect(result.current.settings).toBeNull()
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.settings).toEqual({ siteTitle: 'Loja' })
    expect(fetchMock).toHaveBeenCalledWith('/api/site/settings')
  })

  it('resposta não-ok deixa settings nulo, sem lançar', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'erro' }, { status: 500 }))

    const { result } = renderHook(() => useSiteSettings())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.settings).toBeNull()
  })

  it('falha de rede também termina o carregamento com settings nulo', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'))

    const { result } = renderHook(() => useSiteSettings())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.settings).toBeNull()
  })

  it('reload() refaz a chamada e atualiza as configurações', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ siteTitle: 'A' }))
    const { result } = renderHook(() => useSiteSettings())
    await waitFor(() => expect(result.current.loading).toBe(false))

    fetchMock.mockResolvedValueOnce(Response.json({ siteTitle: 'B' }))
    await act(async () => {
      await result.current.reload()
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.current.settings).toEqual({ siteTitle: 'B' })
  })
})
