'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Checkbox, Dialog, FilterDropdown, Heading, Icon, SearchField, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { EmployeeManagementTable } from '@/components/admin/EmployeeManagementTable'
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog'
import { useConfirmDelete } from '@/lib/useConfirmDelete'
import { ALL_PERMISSIONS, PERMISSION_LABELS } from '@/lib/permissions'
import type { Employee, EmployeeFormData, EmployeePermission } from '@/types'

export function EmployeesContent() {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const searchRef = useRef('')
  const [permissionFilter, setPermissionFilter] = useState<string[]>([])

  const [permDialogOpen, setPermDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [editedPerms, setEditedPerms] = useState<EmployeePermission[]>([])

  const fetchEmployees = useCallback(async (searchTerm?: string) => {
    if (!accessToken) return
    try {
      const term = searchTerm ?? searchRef.current
      const params = new URLSearchParams({ role: 'EMPLOYEE' })
      if (term) params.set('search', term)
      permissionFilter.forEach((p) => params.append('permission', p))
      const res = await fetch(`/api/admin/employees?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setEmployees(data.content ?? data)
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao carregar funcionários.' })
    } finally {
      setLoading(false)
    }
  }, [accessToken, permissionFilter, toast])

  const handleSearch = (value: string) => {
    searchRef.current = value
    fetchEmployees(value)
  }

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  const handleCreate = async (data: EmployeeFormData) => {
    if (!accessToken) return
    const res = await fetch('/api/admin/employees', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const created: Employee = await res.json()
      setEmployees((prev) => [...prev, created])
    }
  }

  const handleDelete = async (id: string) => {
    if (!accessToken) return
    const res = await fetch(`/api/admin/employees/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok && res.status !== 204) {
      toast({ variant: 'destructive', description: 'Erro ao excluir funcionário.' })
      throw new Error()
    }
    setEmployees((prev) => prev.filter((e) => e.id !== id))
  }

  const {
    target: deleteTarget,
    setTarget: setDeleteTarget,
    deleting,
    confirm: confirmDelete,
    cancel: cancelDelete,
  } = useConfirmDelete(handleDelete)

  const deleteTargetEmployee = employees.find((e) => e.id === deleteTarget)

  const openPermissionsDialog = (employee: Employee) => {
    setSelectedEmployee(employee)
    setEditedPerms([...(employee.permissions ?? [])])
    setPermDialogOpen(true)
  }

  const togglePerm = (perm: EmployeePermission) => {
    setEditedPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    )
  }

  const handleSavePermissions = async () => {
    if (!accessToken || !selectedEmployee) return
    const res = await fetch(`/api/admin/employees/${selectedEmployee.id}/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ permissions: editedPerms }),
    })
    if (res.ok) {
      setPermDialogOpen(false)
      toast({ variant: 'success', description: 'Permissões salvas com sucesso.' })
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === selectedEmployee.id ? { ...e, permissions: editedPerms } : e
        )
      )
    } else {
      toast({ variant: 'destructive', description: 'Erro ao salvar permissões.' })
    }
  }

  return (
    <PermissionGuard permissions={['MANAGE_EMPLOYEES']}>
      <div>
        <Heading as="h1" size="2xl" className="mb-6">
          Gestão de Funcionários
        </Heading>

        <div className="flex gap-4 mb-4 flex-wrap items-start">
          <SearchField
            id="employees-search"
            label="Buscar funcionários"
            placeholder="Buscar por nome ou e-mail..."
            buttonLabel="Buscar"
            buttonIconOnly
            onSearch={handleSearch}
            className="flex-1 min-w-40"
          />
          <FilterDropdown
            label="Permissão"
            options={ALL_PERMISSIONS.map((p) => ({ value: p, label: PERMISSION_LABELS[p] }))}
            value={permissionFilter}
            onApply={setPermissionFilter}
          />
        </div>

        <EmployeeManagementTable
          employees={employees}
          loading={loading}
          onCreate={handleCreate}
          onDelete={setDeleteTarget}
          onManagePermissions={openPermissionsDialog}
        />

        <Dialog
          open={permDialogOpen}
          onClose={() => setPermDialogOpen(false)}
          title={selectedEmployee ? `Permissões de ${selectedEmployee.name}` : 'Permissões'}
        >
          <div className="flex flex-col gap-3">
            {ALL_PERMISSIONS.map((perm) => {
              const id = `perm-dialog-${perm}`
              return (
                <Checkbox
                  key={perm}
                  id={id}
                  label={PERMISSION_LABELS[perm]}
                  checked={editedPerms.includes(perm)}
                  onChange={() => togglePerm(perm)}
                />
              )
            })}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button iconOnly leftIcon={<Icon name="X" size="sm" />} aria-label="Cancelar" variant="secondary" onClick={() => setPermDialogOpen(false)} />
            <Button iconOnly leftIcon={<Icon name="Save" size="sm" />} aria-label="Salvar" variant="primary" onClick={handleSavePermissions} />
          </div>
        </Dialog>

        <ConfirmDeleteDialog
          open={deleteTarget !== null}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          deleting={deleting}
          title="Excluir funcionário"
          description={deleteTargetEmployee ? `Remover "${deleteTargetEmployee.name}"? Essa ação não pode ser desfeita.` : undefined}
        />
      </div>
    </PermissionGuard>
  )
}
