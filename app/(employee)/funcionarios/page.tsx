'use client'
import { useCallback, useEffect, useState } from 'react'
import { Button, Heading, Skeleton, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { ALL_PERMISSIONS, PERMISSION_LABELS } from '@/lib/permissions'
import type { Employee, EmployeePermission } from '@/types'

export default function EmployeeFuncionariosPage() {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [editedPerms, setEditedPerms] = useState<Record<string, EmployeePermission[]>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  const fetchEmployees = useCallback(async () => {
    if (!accessToken) return
    try {
      const res = await fetch('/api/admin/employees', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      const data: Employee[] = await res.json()
      setEmployees(data)
      const permsMap: Record<string, EmployeePermission[]> = {}
      data.forEach((emp) => { permsMap[emp.id] = [...(emp.permissions ?? [])] })
      setEditedPerms(permsMap)
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao carregar funcionários.' })
    } finally {
      setLoading(false)
    }
  }, [accessToken, toast])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  const togglePerm = (empId: string, perm: EmployeePermission) => {
    setEditedPerms((prev) => {
      const current = prev[empId] ?? []
      const next = current.includes(perm)
        ? current.filter((p) => p !== perm)
        : [...current, perm]
      return { ...prev, [empId]: next }
    })
  }

  const handleSave = async (empId: string) => {
    if (!accessToken) return
    setSaving((prev) => ({ ...prev, [empId]: true }))
    try {
      const res = await fetch(`/api/admin/employees/${empId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ permissions: editedPerms[empId] ?? [] }),
      })
      if (!res.ok) throw new Error()
      toast({ variant: 'success', description: 'Permissões salvas com sucesso.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao salvar permissões.' })
    } finally {
      setSaving((prev) => ({ ...prev, [empId]: false }))
    }
  }

  return (
    <div>
      <Heading as="h1" size="2xl" className="mb-6">
        Gestão de Funcionários
      </Heading>

      {loading ? (
        <div role="status">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="line" height={40} className="mb-2" />
          ))}
        </div>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="text-left p-2 border-b">Nome</th>
              <th className="text-left p-2 border-b">E-mail</th>
              <th className="text-left p-2 border-b">Permissões</th>
              <th className="text-left p-2 border-b">Ações</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-b">
                <td className="p-2 align-top">{emp.name}</td>
                <td className="p-2 align-top">{emp.email}</td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {ALL_PERMISSIONS.map((perm) => {
                      const id = `perm-${emp.id}-${perm}`
                      return (
                        <label
                          key={perm}
                          htmlFor={id}
                          className="flex items-center gap-1 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            id={id}
                            checked={(editedPerms[emp.id] ?? []).includes(perm)}
                            onChange={() => togglePerm(emp.id, perm)}
                          />
                          {PERMISSION_LABELS[perm]}
                        </label>
                      )
                    })}
                  </div>
                </td>
                <td className="p-2 align-top">
                  <Button
                    size="sm"
                    onClick={() => handleSave(emp.id)}
                    disabled={saving[emp.id]}
                  >
                    Salvar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
