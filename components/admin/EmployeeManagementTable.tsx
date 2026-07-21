'use client'
import { useState } from 'react'
import { Button, Dialog, Input, Skeleton, Table, type TableColumn } from 'base-ds'
import type { Employee, EmployeeFormData } from '@/types'

interface Props {
  employees: Employee[]
  loading: boolean
  onCreate: (data: EmployeeFormData) => void
  onDelete: (id: string) => void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function EmployeeManagementTable({ employees, loading, onCreate, onDelete }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const canSubmit = name.trim() !== '' && EMAIL_RE.test(email) && password.length >= 8

  function handleSubmit() {
    onCreate({ name, email, password })
    setDialogOpen(false)
    setName('')
    setEmail('')
    setPassword('')
  }

  function handleClose() {
    setDialogOpen(false)
    setName('')
    setEmail('')
    setPassword('')
  }

  const columns: TableColumn<Employee>[] = [
    { key: 'name', header: 'Nome' },
    { key: 'email', header: 'E-mail' },
    {
      key: 'actions',
      header: 'Ações',
      render: (row) => (
        <Button
          variant="danger"
          aria-label={`Excluir ${row.name}`}
          onClick={() => onDelete(row.id)}
        >
          Excluir
        </Button>
      ),
    },
  ]

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setDialogOpen(true)}>Novo funcionário</Button>
      </div>

      {loading ? (
        <div role="status" aria-label="Carregando funcionários">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="line" height={40} className="mb-2" />
          ))}
        </div>
      ) : (
        <Table columns={columns} data={employees} />
      )}

      <Dialog
        open={dialogOpen}
        onClose={handleClose}
        title="Novo funcionário"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>Salvar</Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="emp-name" className="block text-sm font-medium mb-1">Nome</label>
            <Input
              id="emp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="emp-email" className="block text-sm font-medium mb-1">E-mail</label>
            <Input
              id="emp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="emp-password" className="block text-sm font-medium mb-1">Senha</label>
            <Input
              id="emp-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
