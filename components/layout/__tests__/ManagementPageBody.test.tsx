import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ManagementPageBody } from '../ManagementPageBody'

describe('ManagementPageBody', () => {
  it('renderiza as ações quando passadas', () => {
    render(
      <ManagementPageBody actions={<button>Novo produto</button>}>
        <p>conteúdo</p>
      </ManagementPageBody>,
    )
    expect(screen.getByRole('button', { name: 'Novo produto' })).toBeInTheDocument()
  })

  it('não quebra quando actions é omitido', () => {
    render(
      <ManagementPageBody>
        <p>conteúdo</p>
      </ManagementPageBody>,
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('sempre renderiza os children', () => {
    render(
      <ManagementPageBody>
        <p>conteúdo do content</p>
      </ManagementPageBody>,
    )
    expect(screen.getByText('conteúdo do content')).toBeInTheDocument()
  })
})
