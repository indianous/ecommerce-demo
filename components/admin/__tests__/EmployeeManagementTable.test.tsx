import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@indianous/base-ds'
import { EmployeeManagementTable } from '../EmployeeManagementTable'
import type { Employee } from '@/types'

const mockEmployees: Employee[] = [
  { id: 'emp-1', name: 'Ana Costa', email: 'ana@test.com', role: 'EMPLOYEE', permissions: [], passwordSet: true, emailVerified: true, mfaEnabled: true, primaryAdmin: false },
  { id: 'emp-2', name: 'Bruno Lima', email: 'bruno@test.com', role: 'EMPLOYEE', permissions: [], passwordSet: true, emailVerified: true, mfaEnabled: false, primaryAdmin: false },
]

function renderTable(props: {
  employees?: Employee[]
  onDelete?: (id: string) => void
  onManagePermissions?: (employee: Employee) => void
  selection?: {
    selectedIds: Set<string>
    onToggle: (id: string) => void
    onToggleAll: (ids: string[]) => void
  }
} = {}) {
  return render(
    <ToastProvider>
      <EmployeeManagementTable
        employees={props.employees ?? mockEmployees}
        onDelete={props.onDelete ?? vi.fn()}
        onManagePermissions={props.onManagePermissions}
        selection={props.selection}
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

  it('sem selection, não mostra checkbox de seleção', () => {
    renderTable()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('com selection, mostra checkbox por linha e "selecionar todos" no cabeçalho', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    const onToggleAll = vi.fn()
    renderTable({ selection: { selectedIds: new Set(), onToggle, onToggleAll } })

    expect(screen.getByRole('checkbox', { name: /selecionar todos/i })).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: /selecionar ana costa/i }))
    expect(onToggle).toHaveBeenCalledWith('emp-1')

    await user.click(screen.getByRole('checkbox', { name: /selecionar todos/i }))
    expect(onToggleAll).toHaveBeenCalledWith(['emp-1', 'emp-2'])
  })

  it('coluna "2FA": Ativo para quem configurou, Pendente para quem ainda vai configurar no próximo login', () => {
    renderTable()

    expect(screen.getByRole('columnheader', { name: '2FA' })).toBeInTheDocument()
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Ativo')
    expect(rows[1]).toHaveTextContent('Pendente')
  })

  describe('admin principal (plano 68)', () => {
    const admins: Employee[] = [
      { id: 'adm-1', name: 'Paula Principal', email: 'paula@test.com', role: 'ADMIN', permissions: [], passwordSet: true, emailVerified: true, mfaEnabled: true, primaryAdmin: true },
      { id: 'adm-2', name: 'Carlos Comum', email: 'carlos@test.com', role: 'ADMIN', permissions: [], passwordSet: true, emailVerified: true, mfaEnabled: true, primaryAdmin: false },
    ]

    it('linha do principal mostra o selo "Principal" e não tem a lixeira', () => {
      renderTable({ employees: admins })

      const [principalRow, commonRow] = screen.getAllByRole('row').slice(1)
      expect(principalRow).toHaveTextContent('Principal')
      expect(screen.queryByRole('button', { name: /excluir paula principal/i })).not.toBeInTheDocument()
      expect(commonRow).not.toHaveTextContent('Principal')
      expect(screen.getByRole('button', { name: /excluir carlos comum/i })).toBeInTheDocument()
    })

    it('com selection, a linha do principal não tem checkbox e o "selecionar todos" ignora ela', async () => {
      const user = userEvent.setup()
      const onToggleAll = vi.fn()
      renderTable({ employees: admins, selection: { selectedIds: new Set(), onToggle: vi.fn(), onToggleAll } })

      expect(screen.queryByRole('checkbox', { name: /selecionar paula principal/i })).not.toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: /selecionar carlos comum/i })).toBeInTheDocument()

      await user.click(screen.getByRole('checkbox', { name: /selecionar todos/i }))
      expect(onToggleAll).toHaveBeenCalledWith(['adm-2'])
    })
  })
})
