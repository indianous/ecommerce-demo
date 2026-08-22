import { useCallback, useState } from 'react'

interface UseConfirmDeleteResult<T> {
  target: T | null
  setTarget: (item: T | null) => void
  deleting: boolean
  confirm: () => Promise<void>
  cancel: () => void
}

export function useConfirmDelete<T>(deleteFn: (item: T) => Promise<void>): UseConfirmDeleteResult<T> {
  const [target, setTarget] = useState<T | null>(null)
  const [deleting, setDeleting] = useState(false)

  const confirm = useCallback(async () => {
    if (!target) return
    setDeleting(true)
    try {
      await deleteFn(target)
      setTarget(null)
    } finally {
      setDeleting(false)
    }
  }, [target, deleteFn])

  const cancel = useCallback(() => setTarget(null), [])

  return { target, setTarget, deleting, confirm, cancel }
}
