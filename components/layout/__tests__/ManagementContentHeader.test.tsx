import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ManagementContentHeader } from '../ManagementContentHeader'

describe('ManagementContentHeader', () => {
  it('digitar no campo de busca não chama onSearch', async () => {
    const onSearch = vi.fn()
    const user = userEvent.setup()
    render(
      <ManagementContentHeader
        searchId="test-search"
        searchLabel="Buscar clientes"
        searchPlaceholder="Buscar por nome..."
        onSearch={onSearch}
      />,
    )

    await user.type(screen.getByRole('textbox', { name: 'Buscar clientes' }), 'maria')

    expect(onSearch).not.toHaveBeenCalled()
  })

  it('clicar no botão de busca chama onSearch com o termo digitado', async () => {
    const onSearch = vi.fn()
    const user = userEvent.setup()
    render(
      <ManagementContentHeader
        searchId="test-search"
        searchLabel="Buscar clientes"
        searchPlaceholder="Buscar por nome..."
        onSearch={onSearch}
      />,
    )

    await user.type(screen.getByRole('textbox', { name: 'Buscar clientes' }), 'maria')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(onSearch).toHaveBeenCalledWith('maria')
  })

  it('renderiza o slot de filtros extras quando passado', () => {
    render(
      <ManagementContentHeader
        searchId="test-search"
        searchLabel="Buscar produtos"
        searchPlaceholder="Buscar..."
        onSearch={vi.fn()}
        filters={<button>Categoria</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'Categoria' })).toBeInTheDocument()
  })
})
