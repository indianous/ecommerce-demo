import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PaginationBar } from '../PaginationBar'

describe('PaginationBar', () => {
  it('com totalPages <= 1, não renderiza nada', () => {
    const { container } = render(<PaginationBar page={1} totalPages={1} onPageChange={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('com totalPages > 1, renderiza a navegação de página', () => {
    render(<PaginationBar page={1} totalPages={3} onPageChange={vi.fn()} />)
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument()
  })

  it('clicar em "Next page" chama onPageChange com a página seguinte', async () => {
    const onPageChange = vi.fn()
    const user = userEvent.setup()
    render(<PaginationBar page={1} totalPages={3} onPageChange={onPageChange} />)

    await user.click(screen.getByRole('button', { name: /next page/i }))

    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})
