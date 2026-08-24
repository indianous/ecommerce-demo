'use client'

import { useState } from 'react'
import { Button, Icon, Table, type TableColumn } from 'base-ds'
import type { Employee } from '@/types'
import { CopyButton } from '@/components/ui/CopyButton'
import { sortTableData } from '@/lib/sortTableData'

interface Props {
  employees: Employee[]
  onDelete: (id: string) => void
  onManagePermissions?: (employee: Employee) => void
}

export function EmployeeManagementTable({ employees, onDelete, onManagePermissions }: Props) {
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
    <Table
      columns={columns}
      data={sortedEmployees}
      onSort={(key, direction) => setSort({ key, direction })}
    />
  )
}
