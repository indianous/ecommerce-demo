import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { ToastProvider } from 'base-ds'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/stores/auth.store'
import type { UserRole } from '@/types'
import { WishlistButton } from '../WishlistButton'

let posted = false
const server = setupServer(
  http.post('/api/wishlist/:id', () => {
    posted = true
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(async () => {
  server.resetHandlers()
  posted = false
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

function renderAs(role: UserRole | null) {
  if (role) useAuthStore.setState({ accessToken: 'tok', isAuthenticated: true, role })
  render(
    <ToastProvider>
      <WishlistButton productId="p-1" initialWishlisted={false} />
    </ToastProvider>,
  )
}

const button = () => screen.queryByRole('button', { name: /favoritos/i })

describe('WishlistButton', () => {
  it('visitante: não aparece', () => {
    renderAs(null)
    expect(button()).not.toBeInTheDocument()
  })

  it('cliente: favorita pela conta', async () => {
    const user = userEvent.setup()
    renderAs('CUSTOMER')

    await user.click(button()!)

    await waitFor(() => expect(posted).toBe(true))
    expect(screen.getByRole('button', { name: 'Remover dos favoritos' })).toHaveAttribute('aria-pressed', 'true')
  })

  it.each([['ADMIN' as const], ['EMPLOYEE' as const]])('equipe (%s) na loja: não aparece, como visitante', (role) => {
    renderAs(role)
    expect(button()).not.toBeInTheDocument()
  })
})
