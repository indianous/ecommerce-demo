'use client'

import { useEffect } from 'react'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function EmployeeError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[Employee area error]', error)
  }, [error])

  return (
    <div>
      <h2>Erro na área de funcionários</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Tentar novamente</button>
    </div>
  )
}
