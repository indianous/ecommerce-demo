import { render } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

// Issue #25: o cleanup do Testing Library (registrado no import) precisa desmontar o componente antes do
// afterEach de cada arquivo. Senão, um efeito pendente roda no act() do afterEach, depois da limpeza dos mocks,
// e suja o teste seguinte. Garantido por `sequence.hooks: 'list'` no vitest.config.ts.

let mounted = false

function Probe() {
  useEffect(() => {
    mounted = true
    return () => {
      mounted = false
    }
  }, [])
  return null
}

// Registrado depois do import do Testing Library: com a ordem certa, o componente já foi desmontado aqui.
afterEach(() => {
  expect(mounted, 'o cleanup do Testing Library deveria rodar antes do afterEach do arquivo').toBe(false)
})

describe('ordem entre o cleanup do Testing Library e o afterEach do arquivo', () => {
  it('o componente montado no teste já está desmontado quando o afterEach do arquivo roda', () => {
    render(<Probe />)
    expect(mounted).toBe(true)
  })
})
