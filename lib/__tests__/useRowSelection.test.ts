import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useRowSelection } from '../useRowSelection'

describe('useRowSelection', () => {
  it('começa vazio', () => {
    const { result } = renderHook(() => useRowSelection())
    expect(result.current.selectedCount).toBe(0)
    expect(result.current.isSelected('a')).toBe(false)
  })

  it('toggle marca e desmarca um item', () => {
    const { result } = renderHook(() => useRowSelection())

    act(() => result.current.toggle('a'))
    expect(result.current.isSelected('a')).toBe(true)
    expect(result.current.selectedCount).toBe(1)

    act(() => result.current.toggle('a'))
    expect(result.current.isSelected('a')).toBe(false)
    expect(result.current.selectedCount).toBe(0)
  })

  it('selectAll marca todos os ids passados, substituindo a seleção anterior', () => {
    const { result } = renderHook(() => useRowSelection())

    act(() => result.current.toggle('z'))
    act(() => result.current.selectAll(['a', 'b', 'c']))

    expect(result.current.selectedCount).toBe(3)
    expect(result.current.isSelected('a')).toBe(true)
    expect(result.current.isSelected('b')).toBe(true)
    expect(result.current.isSelected('c')).toBe(true)
    expect(result.current.isSelected('z')).toBe(false)
  })

  it('selectAll com lista vazia desmarca tudo', () => {
    const { result } = renderHook(() => useRowSelection())
    act(() => result.current.selectAll(['a', 'b']))

    act(() => result.current.selectAll([]))

    expect(result.current.selectedCount).toBe(0)
  })

  it('clear esvazia a seleção', () => {
    const { result } = renderHook(() => useRowSelection())
    act(() => result.current.selectAll(['a', 'b']))

    act(() => result.current.clear())

    expect(result.current.selectedCount).toBe(0)
    expect(result.current.isSelected('a')).toBe(false)
  })
})
