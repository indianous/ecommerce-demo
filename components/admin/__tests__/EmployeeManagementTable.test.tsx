import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from 'base-ds'
import { EmployeeManagementTable } from '../EmployeeManagementTable'
import type { Employee } from '@/types'

const mockEmployees: Employee[] = [
  { id: 'emp-1', name: 'Ana Costa', email: 'ana@test.com', role: 'EMPLOYEE', permissions: [] },
  { id: 'emp-2', name: 'Bruno Lima', email: 'bruno@test.com', role: 'EMPLOYEE', permissions: [] },
]

function renderTable(props: {
  employees?: Employee[]
  onDelete?: (id: string) => void
  onManagePermissions?: (employee: Employee) => void
} = {}) {
  return render(
    <ToastProvider>
      <EmployeeManagementTable
        employees={props.employees ?? mockEmployees}
        onDelete={props.onDelete ?? vi.fn()}
        onManagePermissions={props.onManagePermissions}
      />
    </ToastProvider>,
  )
}

describe('EmployeeManagementTable', () => {
  it('renderiza tabela com colunas Nome, E-mail e Ações', () => {
    renderTable()
    expect(screen.getByRole('columnheader', { name: /nome/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /e-mail/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /ações/i })).toBeInTheDocument()
  })

  it('lista os funcionários recebidos via props', () => {
    renderTable()
    expect(screen.getByText('Ana Costa')).toBeInTheDocument()
    expect(screen.getByText('ana@test.com')).toBeInTheDocument()
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument()
    expect(screen.getByText('bruno@test.com')).toBeInTheDocument()
  })

  it('exibe botão de copiar ao lado do nome e do e-mail', () => {
    renderTable()
    expect(screen.getAllByRole('button', { name: 'Copiar nome' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Copiar e-mail' }).length).toBeGreaterThan(0)
  })

  it('sem onManagePermissions, não exibe botão de editar', () => {
    renderTable()
    expect(screen.queryByRole('button', { name: /editar ana costa/i })).not.toBeInTheDocument()
  })

  it('com onManagePermissions, botão de editar chama a callback com o funcionário', async () => {
    const user = userEvent.setup()
    const onManagePermissions = vi.fn()
    renderTable({ onManagePermissions })

    await user.click(screen.getByRole('button', { name: /editar ana costa/i }))

    expect(onManagePermissions).toHaveBeenCalledWith(mockEmployees[0])
  })

  it('botão Excluir chama onDelete com o id correto', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    renderTable({ onDelete })

    await user.click(screen.getByRole('button', { name: /excluir ana costa/i }))

    expect(onDelete).toHaveBeenCalledWith('emp-1')
  })

  it('sem violações de acessibilidade', async () => {
    const { container } = renderTable()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('clicar no cabeçalho "Nome" ordena as linhas (asc, depois desc)', async () => {
    const user = userEvent.setup()
    renderTable()
    await screen.findByText('Bruno Lima')

    const header = screen.getByRole('columnheader', { name: 'Nome' })
    await user.click(header.querySelector('button')!)

    let rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('Ana Costa')
    expect(rows[1]).toContain('Bruno Lima')

    await user.click(header.querySelector('button')!)

    rows = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(rows[0]).toContain('Bruno Lima')
    expect(rows[1]).toContain('Ana Costa')
  })

  it('cabeçalho "E-mail" é ordenável', () => {
    renderTable()
    const header = screen.getByRole('columnheader', { name: /e-mail/i })
    expect(header.querySelector('button')).toBeInTheDocument()
  })
})
