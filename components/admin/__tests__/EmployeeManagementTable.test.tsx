import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from 'base-ds'
import { EmployeeManagementTable } from '../EmployeeManagementTable'
import type { Employee, EmployeeFormData } from '@/types'

const mockEmployees: Employee[] = [
  { id: 'emp-1', name: 'Ana Costa', email: 'ana@test.com', role: 'EMPLOYEE' },
  { id: 'emp-2', name: 'Bruno Lima', email: 'bruno@test.com', role: 'EMPLOYEE' },
]

function renderTable(props: {
  employees?: Employee[]
  onDelete?: (id: string) => void
  onCreate?: (data: EmployeeFormData) => void
  loading?: boolean
} = {}) {
  return render(
    <ToastProvider>
      <EmployeeManagementTable
        employees={props.employees ?? mockEmployees}
        onDelete={props.onDelete ?? vi.fn()}
        onCreate={props.onCreate ?? vi.fn()}
        loading={props.loading ?? false}
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

  it('exibe Skeleton quando loading=true', () => {
    renderTable({ loading: true })
    expect(screen.queryByText('Ana Costa')).not.toBeInTheDocument()
    expect(document.querySelector('[data-loading]') ?? screen.queryByRole('status')).toBeTruthy()
  })

  it('botão "Novo funcionário" abre o Dialog de cadastro', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.click(screen.getByRole('button', { name: /novo funcionário/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('form contém campos Nome, E-mail e Senha', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.click(screen.getByRole('button', { name: /novo funcionário/i }))
    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByLabelText(/nome/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/e-mail/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/senha/i)).toBeInTheDocument()
  })

  it('botão Salvar chama onCreate com os dados preenchidos', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    renderTable({ onCreate })

    await user.click(screen.getByRole('button', { name: /novo funcionário/i }))
    const dialog = screen.getByRole('dialog')

    await user.type(within(dialog).getByLabelText(/nome/i), 'Carlos Melo')
    await user.type(within(dialog).getByLabelText(/e-mail/i), 'carlos@test.com')
    await user.type(within(dialog).getByLabelText(/senha/i), 'senhaSegura1')
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }))

    expect(onCreate).toHaveBeenCalledWith({
      name: 'Carlos Melo',
      email: 'carlos@test.com',
      password: 'senhaSegura1',
    })
  })

  it('botão Salvar permanece desabilitado com e-mail mal formatado', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.click(screen.getByRole('button', { name: /novo funcionário/i }))
    const dialog = screen.getByRole('dialog')

    await user.type(within(dialog).getByLabelText(/nome/i), 'Carlos Melo')
    await user.type(within(dialog).getByLabelText(/e-mail/i), 'email-invalido')
    await user.type(within(dialog).getByLabelText(/senha/i), 'senhaSegura1')

    expect(within(dialog).getByRole('button', { name: /salvar/i })).toBeDisabled()
  })

  it('botão Salvar permanece desabilitado com senha menor que 8 caracteres', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.click(screen.getByRole('button', { name: /novo funcionário/i }))
    const dialog = screen.getByRole('dialog')

    await user.type(within(dialog).getByLabelText(/nome/i), 'Carlos Melo')
    await user.type(within(dialog).getByLabelText(/e-mail/i), 'carlos@test.com')
    await user.type(within(dialog).getByLabelText(/senha/i), 'curta')

    expect(within(dialog).getByRole('button', { name: /salvar/i })).toBeDisabled()
  })

  it('botão Excluir chama onDelete com o id correto', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    renderTable({ onDelete })

    await user.click(screen.getByRole('button', { name: /excluir ana costa/i }))

    expect(onDelete).toHaveBeenCalledWith('emp-1')
  })

  it('dialog fecha ao clicar em Cancelar', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.click(screen.getByRole('button', { name: /novo funcionário/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('sem violações de acessibilidade', async () => {
    const { container } = renderTable()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('mostra mensagem em português quando não há funcionários, não "No data"', () => {
    renderTable({ employees: [] })
    expect(screen.getByText(/nenhum funcionário cadastrado/i)).toBeInTheDocument()
    expect(screen.queryByText('No data')).not.toBeInTheDocument()
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
