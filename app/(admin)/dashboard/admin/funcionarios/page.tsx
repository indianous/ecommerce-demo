'use client'
import { useCallback, useEffect, useState } from 'react'
import { Heading, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { EmployeeManagementTable } from '@/components/admin/EmployeeManagementTable'
import type { Employee, EmployeeFormData } from '@/types'

export default function EmployeesPage() {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEmployees = useCallback(async () => {
    if (!accessToken) return
    try {
      const res = await fetch('/api/admin/employees', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      setEmployees(await res.json())
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
      />
    </div>
  )
}
