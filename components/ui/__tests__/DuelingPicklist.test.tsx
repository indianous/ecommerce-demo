import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DuelingPicklist } from '../DuelingPicklist'

const OPTIONS = [
  { value: 'PERM_A', label: 'Permissão A' },
  { value: 'PERM_B', label: 'Permissão B' },
  { value: 'PERM_C', label: 'Permissão C' },
]

describe('DuelingPicklist', () => {
  it('renderiza itens disponíveis na esquerda e selecionados na direita', () => {
    render(
      <DuelingPicklist
        options={OPTIONS}
        value={['PERM_B']}
        onChange={vi.fn()}
      />
    )

    const leftList = screen.getByRole('listbox', { name: /disponível/i })
    const rightList = screen.getByRole('listbox', { name: /selecionado/i })

    expect(within(leftList).getByText('Permissão A')).toBeInTheDocument()
    expect(within(leftList).getByText('Permissão C')).toBeInTheDocument()
    expect(within(rightList).getByText('Permissão B')).toBeInTheDocument()
  })

  it('botão → move item destacado da esquerda para a direita e chama onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<DuelingPicklist options={OPTIONS} value={[]} onChange={onChange} />)

    const leftList = screen.getByRole('listbox', { name: /disponível/i })
    await user.click(within(leftList).getByText('Permissão A'))
    await user.click(screen.getByRole('button', { name: /^→$/ }))

    expect(onChange).toHaveBeenCalledWith(['PERM_A'])
  })

  it('botão ← remove item da direita e chama onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<DuelingPicklist options={OPTIONS} value={['PERM_B']} onChange={onChange} />)

    const rightList = screen.getByRole('listbox', { name: /selecionado/i })
    await user.click(within(rightList).getByText('Permissão B'))
    await user.click(screen.getByRole('button', { name: /^←$/ }))

    expect(onChange).toHaveBeenCalledWith([])
  })

  it('botão →→ move todos para selecionados', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<DuelingPicklist options={OPTIONS} value={['PERM_B']} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /^→→$/ }))

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining(['PERM_A', 'PERM_B', 'PERM_C'])
    )
  })

  it('botão ←← move todos de volta para disponíveis', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <DuelingPicklist
        options={OPTIONS}
        value={['PERM_A', 'PERM_B', 'PERM_C']}
        onChange={onChange}
      />
    )

    await user.click(screen.getByRole('button', { name: /^←←$/ }))

    expect(onChange).toHaveBeenCalledWith([])
  })

  it('disabled=true desabilita todos os botões de transferência', () => {
    render(<DuelingPicklist options={OPTIONS} value={[]} onChange={vi.fn()} disabled />)

    expect(screen.getByRole('button', { name: /^→$/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^←$/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^→→$/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^←←$/ })).toBeDisabled()
  })
})
