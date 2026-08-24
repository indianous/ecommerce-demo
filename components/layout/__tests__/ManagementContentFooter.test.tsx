import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ManagementContentFooter } from '../ManagementContentFooter'

describe('ManagementContentFooter', () => {
  it('não renderiza nada quando totalPages <= 1', () => {
    const { container } = render(<ManagementContentFooter page={1} totalPages={1} onPageChange={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renderiza a paginação e chama onPageChange quando totalPages > 1', async () => {
    const onPageChange = vi.fn()
    const user = userEvent.setup()
    render(<ManagementContentFooter page={1} totalPages={3} onPageChange={onPageChange} />)

    await user.click(screen.getByRole('button', { name: /next page/i }))

    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})
