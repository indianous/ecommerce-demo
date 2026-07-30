'use client'

import { useState } from 'react'
import { Button, Dialog, Skeleton, Table, type TableColumn } from 'base-ds'
import type { Employee, EmployeeFormData } from '@/types'
import { EmployeeForm } from '@/components/forms/EmployeeForm'

interface Props {
  employees: Employee[]
  loading: boolean
  onCreate: (data: EmployeeFormData) => void
  onDelete: (id: string) => void
  onManagePermissions?: (employee: Employee) => void
}

export function EmployeeManagementTable({ employees, loading, onCreate, onDelete, onManagePermissions }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const columns: TableColumn<Employee>[] = [
    { key: 'name', header: 'Nome' },
    { key: 'email', header: 'E-mail' },
    {
      key: 'actions',
      header: 'Ações',
      render: (row) => (
        <div className="flex gap-2">
          {onManagePermissions && (
            <Button
              variant="secondary"
              aria-label={`Permissões de ${row.name}`}
              onClick={() => onManagePermissions(row)}
            >
              Permissões
            </Button>
          )}
          <Button
            variant="danger"
            aria-label={`Excluir ${row.name}`}
            onClick={() => onDelete(row.id)}
          >
            Excluir
          </Button>
        </div>
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
        onClose={() => setDialogOpen(false)}
        title="Novo funcionário"
      >
        <EmployeeForm
          onSave={(data) => {
            onCreate(data)
            setDialogOpen(false)
          }}
          onCancel={() => setDialogOpen(false)}
        />
      </Dialog>
    </div>
  )
}
