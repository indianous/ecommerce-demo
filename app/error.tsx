'use client'

import { useEffect } from 'react'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main>
      <h2>Algo deu errado.</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Tentar novamente</button>
    </main>
  )
}
