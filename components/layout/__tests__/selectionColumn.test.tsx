import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeSelectionColumn } from '../selectionColumn'

interface Item {
  id: string
  name: string
}

const items: Item[] = [
  { id: '1', name: 'Ana Costa' },
  { id: '2', name: 'Bruno Lima' },
]

function renderHeaderAndRow(
  selectedIds: Set<string>,
  onToggle = vi.fn(),
  onToggleAll = vi.fn(),
) {
  const column = makeSelectionColumn(
    items,
    (i) => i.id,
    (i) => i.name,
    selectedIds,
    onToggle,
    onToggleAll,
  )
  render(
    <table>
      <thead>
        <tr>
          <th>{column.header}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{column.render?.(items[0], 0)}</td>
        </tr>
        <tr>
          <td>{column.render?.(items[1], 1)}</td>
        </tr>
      </tbody>
    </table>,
  )
  return { onToggle, onToggleAll }
}

describe('makeSelectionColumn', () => {
  it('linha tem checkbox com aria-label identificando o item', () => {
    renderHeaderAndRow(new Set())
    expect(screen.getByRole('checkbox', { name: /selecionar ana costa/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /selecionar bruno lima/i })).toBeInTheDocument()
  })

  it('checkbox do cabeçalho fica desmarcado quando nenhuma linha está selecionada', () => {
    renderHeaderAndRow(new Set())
    const headerCheckbox = screen.getByRole('checkbox', { name: /selecionar todos/i })
    expect(headerCheckbox).not.toBeChecked()
  })

  it('checkbox do cabeçalho fica marcado quando todas as linhas da página estão selecionadas', () => {
    renderHeaderAndRow(new Set(['1', '2']))
    const headerCheckbox = screen.getByRole('checkbox', { name: /selecionar todos/i })
    expect(headerCheckbox).toBeChecked()
  })

  it('checkbox do cabeçalho fica indeterminado com seleção parcial', () => {
    renderHeaderAndRow(new Set(['1']))
    const headerCheckbox = screen.getByRole('checkbox', { name: /selecionar todos/i }) as HTMLInputElement
    expect(headerCheckbox.indeterminate).toBe(true)
  })

  it('marcar o checkbox de uma linha chama onToggle com o id dela', async () => {
    const user = userEvent.setup()
    const { onToggle } = renderHeaderAndRow(new Set())

    await user.click(screen.getByRole('checkbox', { name: /selecionar ana costa/i }))

    expect(onToggle).toHaveBeenCalledWith('1')
  })

  it('marcar o checkbox do cabeçalho (nada selecionado) chama onToggleAll com todos os ids', async () => {
    const user = userEvent.setup()
    const { onToggleAll } = renderHeaderAndRow(new Set())

    await user.click(screen.getByRole('checkbox', { name: /selecionar todos/i }))

    expect(onToggleAll).toHaveBeenCalledWith(['1', '2'])
  })

  it('desmarcar o checkbox do cabeçalho (tudo selecionado) chama onToggleAll com lista vazia', async () => {
    const user = userEvent.setup()
    const { onToggleAll } = renderHeaderAndRow(new Set(['1', '2']))

    await user.click(screen.getByRole('checkbox', { name: /selecionar todos/i }))

    expect(onToggleAll).toHaveBeenCalledWith([])
  })

  describe('com isSelectable (plano 68: admin principal fora da seleção)', () => {
    const three: Item[] = [...items, { id: '3', name: 'Carla Dias' }]

    function renderWithSelectable(selectedIds: Set<string>, onToggleAll = vi.fn()) {
      const column = makeSelectionColumn(
        three,
        (i) => i.id,
        (i) => i.name,
        selectedIds,
        vi.fn(),
        onToggleAll,
        (i) => i.id !== '2',
      )
      render(
        <table>
          <thead>
            <tr>
              <th>{column.header}</th>
            </tr>
          </thead>
          <tbody>
            {three.map((item, index) => (
              <tr key={item.id}>
                <td>{column.render?.(item, index)}</td>
              </tr>
            ))}
          </tbody>
        </table>,
      )
      return { onToggleAll }
    }

    it('linha recusada por isSelectable não tem checkbox', () => {
      renderWithSelectable(new Set())
      expect(screen.queryByRole('checkbox', { name: /selecionar bruno lima/i })).not.toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: /selecionar ana costa/i })).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: /selecionar carla dias/i })).toBeInTheDocument()
    })

    it('"Selecionar todos" chama onToggleAll só com os ids selecionáveis', async () => {
      const user = userEvent.setup()
      const { onToggleAll } = renderWithSelectable(new Set())

      await user.click(screen.getByRole('checkbox', { name: /selecionar todos/i }))

      expect(onToggleAll).toHaveBeenCalledWith(['1', '3'])
    })

    it('cabeçalho fica marcado quando todos os selecionáveis estão selecionados', () => {
      renderWithSelectable(new Set(['1', '3']))
      const headerCheckbox = screen.getByRole('checkbox', { name: /selecionar todos/i }) as HTMLInputElement
      expect(headerCheckbox).toBeChecked()
      expect(headerCheckbox.indeterminate).toBe(false)
    })
  })
})
