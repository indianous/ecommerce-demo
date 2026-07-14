import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OrderManagementTable } from '../OrderManagementTable'
import type { AdminOrderResponse } from '@/types'

const mockOrder: AdminOrderResponse = {
  id: 'order-1',
  customerName: 'João Silva',
  customerEmail: 'joao@test.com',
  status: 'PENDING',
  totalAmount: 2999,
  paymentMethod: 'PIX',
  paymentStatus: 'PENDING',
  paymentId: 'PIX-ABC',
  createdAt: '2026-06-29T10:00:00',
  itemCount: 2,
}

describe('OrderManagementTable', () => {
  it('renders order rows with customer info', () => {
    render(<OrderManagementTable orders={[mockOrder]} onStatusChange={vi.fn()} />)
    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('joao@test.com')).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*2\.999/)).toBeInTheDocument()
    expect(screen.getByText('2 itens')).toBeInTheDocument()
  })

  it('shows current order status in the status column', () => {
    render(<OrderManagementTable orders={[mockOrder]} onStatusChange={vi.fn()} />)
    const statusCells = screen.getAllByText('PENDING')
    expect(statusCells.length).toBeGreaterThan(0)
  })

  it('calls onStatusChange when a new status is selected', async () => {
    const onStatusChange = vi.fn()
    const user = userEvent.setup()
    render(<OrderManagementTable orders={[mockOrder]} onStatusChange={onStatusChange} />)

    const select = screen.getByRole('combobox', { name: /status/i })
    await user.selectOptions(select, 'CONFIRMED')

    expect(onStatusChange).toHaveBeenCalledWith('order-1', 'CONFIRMED')
  })
})
