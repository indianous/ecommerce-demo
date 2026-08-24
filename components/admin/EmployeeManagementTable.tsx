'use client'

import { useState } from 'react'
import { Button, Dialog, Icon, Skeleton, Table, type TableColumn, Text } from 'base-ds'
import type { Employee, EmployeeFormData } from '@/types'
import { EmployeeForm } from '@/components/forms/EmployeeForm'
import { CopyButton } from '@/components/ui/CopyButton'
import { sortTableData } from '@/lib/sortTableData'

interface Props {
  employees: Employee[]
  loading: boolean
  onCreate: (data: EmployeeFormData) => void
  onDelete: (id: string) => void
  onManagePermissions?: (employee: Employee) => void
  createLabel?: string
}

export function EmployeeManagementTable({
  employees,
  loading,
  onCreate,
  onDelete,
  onManagePermissions,
  createLabel = 'Novo funcionário',
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const sortedEmployees = sort
    ? sortTableData(employees, sort.key as keyof Employee, sort.direction, 'string')
    : employees

  const columns: TableColumn<Employee>[] = [
    {
      key: 'name',
      header: 'Nome',
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center gap-2">
          {row.name}
          <CopyButton value={row.name} label="nome" />
        </span>
      ),
    },
    {
      key: 'email',
      header: 'E-mail',
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center gap-2">
          {row.email}
          <CopyButton value={row.email} label="e-mail" />
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (row) => (
        <div className="flex gap-2">
          {onManagePermissions && (
            <Button iconOnly leftIcon={<Icon name="Pencil" size="sm" />} aria-label={`Editar ${row.name}`} variant="secondary" onClick={() => onManagePermissions(row)} />
          )}
          <Button iconOnly leftIcon={<Icon name="Trash2" size="sm" />} aria-label={`Excluir ${row.name}`} variant="danger" onClick={() => onDelete(row.id)} />
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button iconOnly leftIcon={<Icon name="UserPlus" size="sm" />} aria-label={createLabel} variant="primary" onClick={() => setDialogOpen(true)} />
      </div>

      {loading ? (
        <div role="status" aria-label="Carregando funcionários">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="line" height={40} className="mb-2" />
          ))}
        </div>
      ) : employees.length === 0 ? (
        <Text size="sm" color="muted">Nenhum funcionário cadastrado.</Text>
      ) : (
        <Table
          columns={columns}
          data={sortedEmployees}
          onSort={(key, direction) => setSort({ key, direction })}
        />
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={createLabel}
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
