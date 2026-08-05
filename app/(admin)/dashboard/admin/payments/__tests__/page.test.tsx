import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const paymentsContentPropsSpy = vi.fn()
vi.mock('@/app/(employee)/dashboard/payments/PaymentsContent', () => ({
  PaymentsContent: (props: Record<string, unknown>) => {
    paymentsContentPropsSpy(props)
    return null
  },
}))

import AdminPaymentsPage from '../page'

describe('AdminPaymentsPage', () => {
  it('renderiza PaymentsContent com basePath="/dashboard/admin/payments"', () => {
    render(<AdminPaymentsPage />)
    expect(paymentsContentPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({ basePath: '/dashboard/admin/payments' }),
    )
  })
})
