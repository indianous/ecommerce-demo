'use client'
import { useCallback, useEffect, useState } from 'react'
import { Checkbox, Dialog, Heading, useToast } from 'base-ds'
import { IconButton } from '@/components/ui/IconButton'
import { useAuthStore } from '@/stores/auth.store'
import { EmployeeManagementTable } from '@/components/admin/EmployeeManagementTable'
import { ALL_PERMISSIONS, PERMISSION_LABELS } from '@/lib/permissions'
import type { Employee, EmployeeFormData, EmployeePermission } from '@/types'

export default function EmployeesPage() {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  const [permDialogOpen, setPermDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [editedPerms, setEditedPerms] = useState<EmployeePermission[]>([])

  const fetchEmployees = useCallback(async () => {
    if (!accessToken) return
    try {
      const res = await fetch('/api/admin/employees', {
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
  }, [accessToken, toast])

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
    if (res.ok || res.status === 204) {
      setEmployees((prev) => prev.filter((e) => e.id !== id))
    }
  }

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
    <div>
      <Heading as="h1" size="2xl" className="mb-6">
        Gestão de Funcionários
      </Heading>

      <EmployeeManagementTable
        employees={employees}
        loading={loading}
        onCreate={handleCreate}
        onDelete={handleDelete}
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
          <IconButton
            icon="X"
            label="Cancelar"
            variant="secondary"
            onClick={() => setPermDialogOpen(false)}
          />
          <IconButton icon="Save" label="Salvar" variant="primary" onClick={handleSavePermissions} />
        </div>
      </Dialog>
    </div>
  )
}
