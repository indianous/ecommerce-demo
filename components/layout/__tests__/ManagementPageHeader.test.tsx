import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ManagementPageHeader } from '../ManagementPageHeader'

describe('ManagementPageHeader', () => {
  it('renderiza o título como heading', () => {
    render(<ManagementPageHeader title="Gestão de Produtos" />)
    expect(screen.getByRole('heading', { name: 'Gestão de Produtos' })).toBeInTheDocument()
  })

  it('renderiza a descrição quando passada', () => {
    render(<ManagementPageHeader title="Envios" description="Pedidos confirmados aguardando envio" />)
    expect(screen.getByText('Pedidos confirmados aguardando envio')).toBeInTheDocument()
  })

  it('não renderiza descrição quando omitida', () => {
    render(<ManagementPageHeader title="Envios" />)
    expect(screen.queryByText(/aguardando envio/i)).not.toBeInTheDocument()
  })
})
