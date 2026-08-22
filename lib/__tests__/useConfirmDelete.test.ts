import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useConfirmDelete } from '../useConfirmDelete'

describe('useConfirmDelete', () => {
  it('target começa null', () => {
    const { result } = renderHook(() => useConfirmDelete(vi.fn()))
    expect(result.current.target).toBeNull()
    expect(result.current.deleting).toBe(false)
  })

  it('setTarget(x) abre (target passa a ser x)', () => {
    const { result } = renderHook(() => useConfirmDelete(vi.fn()))
    act(() => result.current.setTarget({ id: '1' }))
    expect(result.current.target).toEqual({ id: '1' })
  })

  it('confirm() chama a função de delete passada e depois zera target', async () => {
    const deleteFn = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useConfirmDelete(deleteFn))
    act(() => result.current.setTarget({ id: '1' }))

    await act(async () => {
      await result.current.confirm()
    })

    expect(deleteFn).toHaveBeenCalledWith({ id: '1' })
    expect(result.current.target).toBeNull()
    expect(result.current.deleting).toBe(false)
  })

  it('erro na função de delete não fecha o dialog e não deixa deleting travado em true', async () => {
    const deleteFn = vi.fn().mockRejectedValue(new Error('falhou'))
    const { result } = renderHook(() => useConfirmDelete(deleteFn))
    act(() => result.current.setTarget({ id: '1' }))

    await act(async () => {
      await expect(result.current.confirm()).rejects.toThrow('falhou')
    })

    expect(result.current.target).toEqual({ id: '1' })
    expect(result.current.deleting).toBe(false)
  })

  it('deleting fica true durante a chamada de delete', async () => {
    let resolveDelete: () => void = () => {}
    const deleteFn = vi.fn(() => new Promise<void>((resolve) => { resolveDelete = resolve }))
    const { result } = renderHook(() => useConfirmDelete(deleteFn))
    act(() => result.current.setTarget({ id: '1' }))

    let confirmPromise!: Promise<void>
    act(() => {
      confirmPromise = result.current.confirm()
    })

    await waitFor(() => expect(result.current.deleting).toBe(true))

    await act(async () => {
      resolveDelete()
      await confirmPromise
    })

    expect(result.current.deleting).toBe(false)
  })

  it('cancel() zera target sem chamar a função de delete', () => {
    const deleteFn = vi.fn()
    const { result } = renderHook(() => useConfirmDelete(deleteFn))
    act(() => result.current.setTarget({ id: '1' }))

    act(() => result.current.cancel())

    expect(result.current.target).toBeNull()
    expect(deleteFn).not.toHaveBeenCalled()
  })
})
