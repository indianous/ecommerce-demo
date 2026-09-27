import { createRequire } from 'module'
import { render, screen } from '@testing-library/react'
import { Dialog } from '@indianous/base-ds'
import { describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)

describe('base-ds e React', () => {
  it('o base-ds resolve a mesma cópia de React do app (indianous/base-ds#38)', () => {
    const baseDsEntry = require.resolve('@indianous/base-ds')

    expect(require.resolve('react', { paths: [baseDsEntry] })).toBe(require.resolve('react'))
  })

  it('renderiza um componente do base-ds com hooks sem "Invalid hook call"', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <Dialog open onClose={() => {}} title="Teste">
        conteúdo
      </Dialog>,
    )

    expect(screen.getByRole('dialog', { name: 'Teste' })).toBeInTheDocument()
    expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining('Invalid hook call'))
    consoleError.mockRestore()
  })
})
