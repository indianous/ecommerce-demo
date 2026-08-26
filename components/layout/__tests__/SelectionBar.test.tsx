import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SelectionBar } from '../SelectionBar'

describe('SelectionBar', () => {
  it('não renderiza nada quando selectedCount é 0', () => {
    const { container } = render(<SelectionBar selectedCount={0} onClear={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('mostra a contagem e o botão "Limpar seleção" quando selectedCount > 0', () => {
    render(<SelectionBar selectedCount={3} onClear={vi.fn()} />)

    expect(screen.getByText(/3 selecionados/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /limpar seleção/i })).toBeInTheDocument()
  })

  it('singular quando selectedCount é 1', () => {
    render(<SelectionBar selectedCount={1} onClear={vi.fn()} />)
    expect(screen.getByText(/1 selecionado$/i)).toBeInTheDocument()
  })

  it('clicar em "Limpar seleção" chama onClear', async () => {
    const onClear = vi.fn()
    const user = userEvent.setup()
    render(<SelectionBar selectedCount={2} onClear={onClear} />)

    await user.click(screen.getByRole('button', { name: /limpar seleção/i }))

    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('renderiza o que vier em actions', () => {
    render(<SelectionBar selectedCount={2} onClear={vi.fn()} actions={<button>Excluir selecionados</button>} />)
    expect(screen.getByRole('button', { name: /excluir selecionados/i })).toBeInTheDocument()
  })
})
