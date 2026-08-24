'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Heading, SearchField, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { EmployeeManagementTable } from '@/components/admin/EmployeeManagementTable'
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog'
import { useConfirmDelete } from '@/lib/useConfirmDelete'
import type { Employee, EmployeeFormData } from '@/types'

export function AdminsContent() {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [admins, setAdmins] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const searchRef = useRef('')

  const fetchAdmins = useCallback(async (searchTerm?: string) => {
    if (!accessToken) return
    try {
      const term = searchTerm ?? searchRef.current
      const params = new URLSearchParams()
      if (term) params.set('search', term)
      const res = await fetch(`/api/admin/admins?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAdmins(data.content ?? data)
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao carregar administradores.' })
    } finally {
      setLoading(false)
    }
  }, [accessToken, toast])

  const handleSearch = (value: string) => {
    searchRef.current = value
    fetchAdmins(value)
  }

  useEffect(() => {
    fetchAdmins()
  }, [fetchAdmins])

  const handleCreate = async (data: EmployeeFormData) => {
    if (!accessToken) return
    const res = await fetch('/api/admin/admins', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const created: Employee = await res.json()
      setAdmins((prev) => [...prev, created])
      toast({ variant: 'success', description: 'Administrador criado com sucesso.' })
    } else {
      const body = await res.json().catch(() => ({ message: 'Erro ao criar administrador.' }))
      toast({ variant: 'destructive', description: body.message ?? 'Erro ao criar administrador.' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!accessToken) return
    const res = await fetch(`/api/admin/admins/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok && res.status !== 204) {
      const body = await res.json().catch(() => ({ message: 'Erro ao excluir administrador.' }))
      toast({ variant: 'destructive', description: body.message ?? 'Erro ao excluir administrador.' })
      throw new Error()
    }
    setAdmins((prev) => prev.filter((a) => a.id !== id))
  }

  const {
    target: deleteTarget,
    setTarget: setDeleteTarget,
    deleting,
    confirm: confirmDelete,
    cancel: cancelDelete,
  } = useConfirmDelete(handleDelete)

  const deleteTargetAdmin = admins.find((a) => a.id === deleteTarget)

  return (
    <div>
      <Heading as="h1" size="2xl" className="mb-6">
        Gestão de Administradores
      </Heading>

      <div className="mb-4">
        <SearchField
          id="admins-search"
          label="Buscar administradores"
          placeholder="Buscar por nome ou e-mail..."
          buttonLabel="Buscar"
          buttonIconOnly
          onSearch={handleSearch}
          className="max-w-md"
        />
      </div>

      <EmployeeManagementTable
        employees={admins}
        loading={loading}
        onCreate={handleCreate}
        onDelete={setDeleteTarget}
        createLabel="Novo administrador"
      />

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        deleting={deleting}
        title="Excluir administrador"
        description={deleteTargetAdmin ? `Remover "${deleteTargetAdmin.name}"? Essa ação não pode ser desfeita.` : undefined}
      />
    </div>
  )
}
