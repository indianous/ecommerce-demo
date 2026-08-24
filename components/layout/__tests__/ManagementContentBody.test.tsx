import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ManagementContentBody } from '../ManagementContentBody'

describe('ManagementContentBody', () => {
  it('mostra o estado de loading quando loading=true', () => {
    render(
      <ManagementContentBody loading empty={false} emptyMessage="Nenhum item.">
        <table />
      </ManagementContentBody>,
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('mostra a mensagem vazia em português quando empty=true e loading=false', () => {
    render(
      <ManagementContentBody loading={false} empty emptyMessage="Nenhum produto encontrado.">
        <table />
      </ManagementContentBody>,
    )
    expect(screen.getByText('Nenhum produto encontrado.')).toBeInTheDocument()
    expect(screen.queryByText('No data')).not.toBeInTheDocument()
  })

  it('renderiza os children quando não está carregando nem vazio', () => {
    render(
      <ManagementContentBody loading={false} empty={false} emptyMessage="Nenhum item.">
        <p>tabela aqui</p>
      </ManagementContentBody>,
    )
    expect(screen.getByText('tabela aqui')).toBeInTheDocument()
  })
})
