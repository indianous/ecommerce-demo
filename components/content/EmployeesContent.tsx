'use client'
import { useCallback, useRef, useState } from 'react'
import { authFetch } from '@/lib/authFetch'
import { Button, Checkbox, Dialog, FilterDropdown, Icon, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { EmployeeManagementTable } from '@/components/admin/EmployeeManagementTable'
import { EmployeeForm } from '@/components/forms/EmployeeForm'
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog'
import { ManagementPageHeader } from '@/components/layout/ManagementPageHeader'
import { ManagementPageBody } from '@/components/layout/ManagementPageBody'
import { ManagementContentHeader } from '@/components/layout/ManagementContentHeader'
import { ManagementContentBody } from '@/components/layout/ManagementContentBody'
import { ManagementContentFooter } from '@/components/layout/ManagementContentFooter'
import { SelectionBar } from '@/components/layout/SelectionBar'
import { useConfirmDelete } from '@/lib/useConfirmDelete'
import { useRowSelection } from '@/lib/useRowSelection'
import { usePaginatedFetch, type PageResult } from '@/lib/usePaginatedFetch'
import { ALL_PERMISSIONS, PERMISSION_LABELS } from '@/lib/permissions'
import type { BulkOperationResult, Employee, EmployeeFormData, EmployeePermission } from '@/types'

export function EmployeesContent() {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const searchRef = useRef('')
  const [permissionFilter, setPermissionFilter] = useState<string[]>([])

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [permDialogOpen, setPermDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [editedPerms, setEditedPerms] = useState<EmployeePermission[]>([])

  const fetchPage = useCallback(async (params: URLSearchParams): Promise<PageResult<Employee> | null> => {
    if (!accessToken) return null
    params.set('role', 'EMPLOYEE')
    if (searchRef.current) params.set('search', searchRef.current)
    permissionFilter.forEach((p) => params.append('permission', p))
    try {
      const res = await authFetch(`/api/admin/employees?${params}`)
      if (!res.ok) throw new Error()
      return await res.json()
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao carregar funcionários.' })
      return null
    }
  }, [accessToken, permissionFilter, toast])

  const { page, items: employees, setItems: setEmployees, totalPages, loading, goToPage, reload } = usePaginatedFetch(fetchPage)

  const handleSearch = (value: string) => {
    searchRef.current = value
    reload()
  }

  const handleCreate = async (data: EmployeeFormData) => {
    if (!accessToken) return
    const res = await authFetch('/api/admin/employees', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const created: Employee = await res.json()
      setEmployees((prev) => [...prev, created])
      setCreateDialogOpen(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!accessToken) return
    const res = await authFetch(`/api/admin/employees/${id}`, {
      method: 'DELETE',
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

  const selection = useRowSelection()

  const handleBulkDelete = async (ids: string[]) => {
    if (!accessToken) return
    const res = await fetch('/api/admin/employees/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ ids }),
    })
    if (!res.ok) {
      toast({ variant: 'destructive', description: 'Erro ao excluir funcionários selecionados.' })
      throw new Error()
    }
    const result: BulkOperationResult = await res.json()
    const failedIds = new Set(result.failures.map((f) => f.id))
    setEmployees((prev) => prev.filter((e) => !ids.includes(e.id) || failedIds.has(e.id)))
    selection.clear()
    if (result.failures.length > 0) {
      toast({
        variant: 'destructive',
        description: `${result.successCount} excluído(s). Não foi possível excluir: ${result.failures.map((f) => f.reason).join('; ')}`,
      })
    } else {
      toast({ variant: 'success', description: `${result.successCount} funcionário(s) excluído(s).` })
    }
  }

  const {
    target: bulkDeleteTarget,
    setTarget: setBulkDeleteTarget,
    deleting: bulkDeleting,
    confirm: confirmBulkDelete,
    cancel: cancelBulkDelete,
  } = useConfirmDelete(handleBulkDelete)

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
    const res = await authFetch(`/api/admin/employees/${selectedEmployee.id}/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
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
      <ManagementPageHeader title="Gestão de Funcionários" />
      <ManagementPageBody
        actions={
          <Button iconOnly leftIcon={<Icon name="UserPlus" size="sm" />} aria-label="Novo funcionário" variant="primary" onClick={() => setCreateDialogOpen(true)} />
        }
      >
        <ManagementContentHeader
          searchId="employees-search"
          searchLabel="Buscar funcionários"
          searchPlaceholder="Buscar por nome ou e-mail..."
          onSearch={handleSearch}
          filters={
            <FilterDropdown
              label="Permissão"
              options={ALL_PERMISSIONS.map((p) => ({ value: p, label: PERMISSION_LABELS[p] }))}
              value={permissionFilter}
              onApply={setPermissionFilter}
            />
          }
        />

        <SelectionBar
          selectedCount={selection.selectedCount}
          onClear={selection.clear}
          actions={
            <Button
              leftIcon={<Icon name="Trash2" size="sm" />}
              variant="danger"
              size="sm"
              onClick={() => setBulkDeleteTarget(Array.from(selection.selectedIds))}
            >
              Excluir selecionados
            </Button>
          }
        />

        <ManagementContentBody loading={loading} empty={employees.length === 0} emptyMessage="Nenhum funcionário cadastrado." loadingLabel="Carregando funcionários">
          <EmployeeManagementTable
            employees={employees}
            onDelete={setDeleteTarget}
            onManagePermissions={openPermissionsDialog}
            selection={{ selectedIds: selection.selectedIds, onToggle: selection.toggle, onToggleAll: selection.selectAll }}
          />
        </ManagementContentBody>

        <ManagementContentFooter page={page} totalPages={totalPages} onPageChange={(p) => { goToPage(p); selection.clear() }} />

        <Dialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          title="Novo funcionário"
        >
          <EmployeeForm
            onSave={handleCreate}
            onCancel={() => setCreateDialogOpen(false)}
          />
        </Dialog>

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

        <ConfirmDeleteDialog
          open={bulkDeleteTarget !== null}
          onClose={cancelBulkDelete}
          onConfirm={confirmBulkDelete}
          deleting={bulkDeleting}
          title="Excluir funcionários"
          description={bulkDeleteTarget ? `Remover ${bulkDeleteTarget.length} funcionário(s) selecionado(s)? Essa ação não pode ser desfeita.` : undefined}
        />
      </ManagementPageBody>
    </PermissionGuard>
  )
}
