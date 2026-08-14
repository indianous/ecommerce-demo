import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Tooltip } from '../Tooltip'

describe('Tooltip', () => {
  it('não mostra o balão antes do hover/focus', () => {
    render(
      <Tooltip label="Salvar">
        <button type="button">botão</button>
      </Tooltip>,
    )

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('mouseenter no filho mostra o balão com role="tooltip" e o texto de label', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip label="Salvar">
        <button type="button">botão</button>
      </Tooltip>,
    )

    await user.hover(screen.getByRole('button'))

    expect(screen.getByRole('tooltip')).toHaveTextContent('Salvar')
  })

  it('mouseleave esconde o balão', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip label="Salvar">
        <button type="button">botão</button>
      </Tooltip>,
    )

    const trigger = screen.getByRole('button')
    await user.hover(trigger)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    await user.unhover(trigger)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('focus no filho mostra o balão; blur esconde', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip label="Salvar">
        <button type="button">botão</button>
      </Tooltip>,
    )

    await user.tab()
    expect(screen.getByRole('button')).toHaveFocus()
    expect(screen.getByRole('tooltip')).toHaveTextContent('Salvar')

    await user.tab()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
