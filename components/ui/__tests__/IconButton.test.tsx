import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { IconButton } from '../IconButton'

describe('IconButton', () => {
  it('renderiza o Icon do base-ds com o name recebido', () => {
    render(<IconButton icon="Save" label="Salvar" />)

    const button = screen.getByRole('button', { name: 'Salvar' })
    expect(button.querySelector('svg')).toBeInTheDocument()
  })

  it('aria-label do botão é igual ao label', () => {
    render(<IconButton icon="Save" label="Salvar" />)

    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Salvar')
  })

  it('hover mostra o tooltip com o mesmo texto de label', async () => {
    const user = userEvent.setup()
    render(<IconButton icon="Save" label="Salvar" />)

    await user.hover(screen.getByRole('button', { name: 'Salvar' }))

    expect(screen.getByRole('tooltip')).toHaveTextContent('Salvar')
  })

  it('as="a" href="..." renderiza <a> em vez de <button>', () => {
    render(<IconButton as="a" href="/catalog" icon="ArrowRight" label="Ver catálogo" />)

    const link = screen.getByRole('link', { name: 'Ver catálogo' })
    expect(link).toHaveAttribute('href', '/catalog')
  })

  it('disabled bloqueia clique', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<IconButton icon="Save" label="Salvar" disabled onClick={onClick} />)

    const button = screen.getByRole('button', { name: 'Salvar' })
    expect(button).toBeDisabled()
    await user.click(button)

    expect(onClick).not.toHaveBeenCalled()
  })

  it('isLoading mostra spinner, desabilita o botão e mantém o aria-label', () => {
    render(<IconButton icon="Save" label="Salvar" isLoading />)

    const button = screen.getByRole('button', { name: 'Salvar' })
    expect(button).toBeDisabled()
    expect(button.querySelector('[role="status"]')).toBeInTheDocument()
  })
})
