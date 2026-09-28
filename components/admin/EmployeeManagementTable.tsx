'use client'

import { useState } from 'react'
import { Badge, Button, Icon, Table, type TableColumn } from '@indianous/base-ds'
import type { Employee } from '@/types'
import { CopyButton } from '@/components/ui/CopyButton'
import { makeSelectionColumn } from '@/components/layout/selectionColumn'
import { sortTableData } from '@/lib/sortTableData'

interface Props {
  employees: Employee[]
  onDelete: (id: string) => void
  onManagePermissions?: (employee: Employee) => void
  selection?: {
    selectedIds: Set<string>
    onToggle: (id: string) => void
    onToggleAll: (ids: string[]) => void
  }
}

export function EmployeeManagementTable({ employees, onDelete, onManagePermissions, selection }: Props) {
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const sortedEmployees = sort
    ? sortTableData(employees, sort.key as keyof Employee, sort.direction, 'string')
    : employees

  const columns: TableColumn<Employee>[] = [
    ...(selection
      ? [makeSelectionColumn(sortedEmployees, (e) => e.id, (e) => e.name, selection.selectedIds, selection.onToggle, selection.onToggleAll, (e) => !e.primaryAdmin)]
      : []),
    {
      key: 'name',
      header: 'Nome',
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center gap-2">
          {row.name}
          <CopyButton value={row.name} label="nome" />
          {row.primaryAdmin && <Badge variant="default">Principal</Badge>}
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
      key: 'mfaEnabled',
      header: '2FA',
      render: (row) => (
        <Badge variant={row.mfaEnabled ? 'success' : 'warning'}>{row.mfaEnabled ? 'Ativo' : 'Pendente'}</Badge>
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
          {!row.primaryAdmin && (
            <Button iconOnly leftIcon={<Icon name="Trash2" size="sm" />} aria-label={`Excluir ${row.name}`} variant="danger" onClick={() => onDelete(row.id)} />
          )}
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
