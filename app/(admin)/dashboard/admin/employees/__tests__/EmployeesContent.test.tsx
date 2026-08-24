import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { EmployeesContent } from '../EmployeesContent'
import { useAuthStore } from '@/stores/auth.store'
import type { Employee } from '@/types'

const mockEmployees: Employee[] = [
  { id: 'emp-1', name: 'Ana Costa', email: 'ana@test.com', role: 'EMPLOYEE', permissions: [] },
]

let lastDeletedId = ''

const server = setupServer(
  http.get('/api/admin/employees', () => HttpResponse.json(mockEmployees)),
  http.delete('/api/admin/employees/:id', ({ params }) => {
    lastDeletedId = params.id as string
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen())
afterEach(async () => {
  server.resetHandlers()
  lastDeletedId = ''
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
})
afterAll(() => server.close())

beforeEach(() => {
  useAuthStore.setState({
    isAuthenticated: true,
    accessToken: 'mock-token',
    role: 'ADMIN' as const,
    user: {
      id: '1',
      name: 'Admin',
      email: 'admin@test.com',
      role: 'ADMIN' as const,
    },
  })
})

function renderContent() {
  return render(
    <ToastProvider>
      <EmployeesContent />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('EmployeesContent (admin) — exclusão', () => {
  it('clicar em excluir abre o dialog de confirmação com o nome do funcionário', async () => {
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Ana Costa')

    await user.click(screen.getByRole('button', { name: /excluir ana costa/i }))

    const dialog = screen.getByRole('dialog', { name: /excluir funcionário/i })
    expect(dialog).toHaveTextContent('Ana Costa')
    expect(lastDeletedId).toBe('')
  })

  it('cancelar não chama DELETE', async () => {
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Ana Costa')

    await user.click(screen.getByRole('button', { name: /excluir ana costa/i }))
    await user.click(screen.getByRole('button', { name: /^cancelar$/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(lastDeletedId).toBe('')
  })

  it('confirmar chama DELETE /api/admin/employees/:id e some da lista', async () => {
    const user = userEvent.setup()
    renderContent()
    await screen.findByText('Ana Costa')

    await user.click(screen.getByRole('button', { name: /excluir ana costa/i }))
    await user.click(screen.getByRole('button', { name: /^confirmar$/i }))

    expect(lastDeletedId).toBe('emp-1')
    expect(screen.queryByText('Ana Costa')).not.toBeInTheDocument()
  })
})
