import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { usePaginatedFetch } from '../usePaginatedFetch'

const pushMock = vi.fn()
let mockSearch = ''

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/dashboard/customers',
  useSearchParams: () => new URLSearchParams(mockSearch),
}))

beforeEach(() => {
  pushMock.mockClear()
  mockSearch = ''
})

describe('usePaginatedFetch', () => {
  it('page começa em 1 quando não há ?page= na URL', async () => {
    const fetcher = vi.fn().mockResolvedValue({ content: ['a'], totalPages: 3 })
    const { result } = renderHook(() => usePaginatedFetch(fetcher))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.page).toBe(1)
  })

  it('page vem de ?page= na URL diretamente, sem precisar clicar em nada', async () => {
    mockSearch = 'page=3'
    const fetcher = vi.fn().mockResolvedValue({ content: [], totalPages: 5 })
    const { result } = renderHook(() => usePaginatedFetch(fetcher))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.page).toBe(3)
    expect(fetcher).toHaveBeenCalledWith(new URLSearchParams({ page: '2', size: '20' }))
  })

  it('carrega items e totalPages a partir do resultado do fetcher', async () => {
    const fetcher = vi.fn().mockResolvedValue({ content: ['x', 'y'], totalPages: 2 })
    const { result } = renderHook(() => usePaginatedFetch(fetcher))

    await waitFor(() => expect(result.current.items).toEqual(['x', 'y']))
    expect(result.current.totalPages).toBe(2)
  })

  it('fetcher retornando null (erro) não quebra — items/totalPages mantêm o valor anterior', async () => {
    const fetcher = vi.fn().mockResolvedValue(null)
    const { result } = renderHook(() => usePaginatedFetch(fetcher))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toEqual([])
    expect(result.current.totalPages).toBe(1)
  })

  it('goToPage escreve ?page= de volta na URL', async () => {
    const fetcher = vi.fn().mockResolvedValue({ content: [], totalPages: 5 })
    const { result } = renderHook(() => usePaginatedFetch(fetcher))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.goToPage(2))

    expect(pushMock).toHaveBeenCalledWith('/dashboard/customers?page=2')
  })

  it('reload(): se já está na página 1, chama o fetcher de novo sem navegar', async () => {
    const fetcher = vi.fn().mockResolvedValue({ content: [], totalPages: 1 })
    const { result } = renderHook(() => usePaginatedFetch(fetcher))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const callsBeforeReload = fetcher.mock.calls.length

    await act(async () => { await result.current.reload() })

    expect(pushMock).not.toHaveBeenCalled()
    expect(fetcher.mock.calls.length).toBe(callsBeforeReload + 1)
  })

  it('refetch(): chama o fetcher de novo para a página atual, sem navegar', async () => {
    mockSearch = 'page=3'
    const fetcher = vi.fn().mockResolvedValue({ content: [], totalPages: 5 })
    const { result } = renderHook(() => usePaginatedFetch(fetcher))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const callsBeforeRefetch = fetcher.mock.calls.length

    await act(async () => { await result.current.refetch() })

    expect(pushMock).not.toHaveBeenCalled()
    expect(fetcher.mock.calls.length).toBe(callsBeforeRefetch + 1)
    expect(fetcher).toHaveBeenLastCalledWith(new URLSearchParams({ page: '2', size: '20' }))
  })

  it('reload(): se não está na página 1, navega para page=1 em vez de chamar o fetcher direto', async () => {
    mockSearch = 'page=3'
    const fetcher = vi.fn().mockResolvedValue({ content: [], totalPages: 5 })
    const { result } = renderHook(() => usePaginatedFetch(fetcher))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.reload())

    expect(pushMock).toHaveBeenCalledWith('/dashboard/customers?page=1')
  })
})
