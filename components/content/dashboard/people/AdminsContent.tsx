'use client'
import { useCallback, useRef, useState } from 'react'
import { authFetch } from '@/lib/authFetch'
import { Button, Container, Dialog, Icon, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { EmployeeManagementTable } from '@/components/admin/EmployeeManagementTable'
import { EMPTY_EMPLOYEE_FORM, EmployeeForm, toEmployeeInput, type EmployeeFormState } from '@/components/forms/EmployeeForm'
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
import type { BulkOperationResult, Employee } from '@/types'

export function AdminsContent() {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const searchRef = useRef('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>(EMPTY_EMPLOYEE_FORM)
  const [creating, setCreating] = useState(false)

  const fetchPage = useCallback(async (params: URLSearchParams): Promise<PageResult<Employee> | null> => {
    if (!accessToken) return null
    if (searchRef.current) params.set('search', searchRef.current)
    try {
      const res = await authFetch(`/api/admin/admins?${params}`)
      if (!res.ok) throw new Error()
      return await res.json()
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao carregar administradores.' })
      return null
    }
  }, [accessToken, toast])

  const { page, items: admins, setItems: setAdmins, totalPages, loading, goToPage, reload } = usePaginatedFetch(fetchPage)

  const handleSearch = (value: string) => {
    searchRef.current = value
    reload()
  }

  const openCreateDialog = () => {
    setEmployeeForm(EMPTY_EMPLOYEE_FORM)
    setCreateDialogOpen(true)
  }

  const handleCreate = async () => {
    if (!accessToken) return
    const input = toEmployeeInput(employeeForm)
    setCreating(true)
    try {
      const res = await authFetch('/api/admin/admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })
      if (res.ok) {
        const created: Employee = await res.json()
        setAdmins((prev) => [...prev, created])
        setCreateDialogOpen(false)
        toast({
          variant: 'success',
          description: input.password ? 'Administrador criado com sucesso.' : `Convite enviado para ${input.email}`,
        })
      } else {
        const body = await res.json().catch(() => ({ message: 'Erro ao criar administrador.' }))
        toast({ variant: 'destructive', description: body.message ?? 'Erro ao criar administrador.' })
      }
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!accessToken) return
    const res = await authFetch(`/api/admin/admins/${id}`, {
      method: 'DELETE',
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

  const selection = useRowSelection()

  const handleBulkDelete = async (ids: string[]) => {
    if (!accessToken) return
    const res = await fetch('/api/admin/admins/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ ids }),
    })
    if (!res.ok) {
      toast({ variant: 'destructive', description: 'Erro ao excluir administradores selecionados.' })
      throw new Error()
    }
    const result: BulkOperationResult = await res.json()
    const failedIds = new Set(result.failures.map((f) => f.id))
    setAdmins((prev) => prev.filter((a) => !ids.includes(a.id) || failedIds.has(a.id)))
    selection.clear()
    if (result.failures.length > 0) {
      toast({
        variant: 'destructive',
        description: `${result.successCount} excluído(s). Não foi possível excluir: ${result.failures.map((f) => f.reason).join('; ')}`,
      })
    } else {
      toast({ variant: 'success', description: `${result.successCount} administrador(es) excluído(s).` })
    }
  }

  const {
    target: bulkDeleteTarget,
    setTarget: setBulkDeleteTarget,
    deleting: bulkDeleting,
    confirm: confirmBulkDelete,
    cancel: cancelBulkDelete,
  } = useConfirmDelete(handleBulkDelete)

  return (
    <Container>
      <ManagementPageHeader title="Gestão de Administradores" />
      <ManagementPageBody
        actions={
          <Button leftIcon={<Icon name="UserPlus" size="sm" />} variant="primary" onClick={openCreateDialog}>Novo administrador</Button>
        }
      >
        <ManagementContentHeader
          searchId="admins-search"
          searchLabel="Buscar administradores"
          searchPlaceholder="Buscar por nome ou e-mail..."
          onSearch={handleSearch}
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

        <ManagementContentBody loading={loading} empty={admins.length === 0} emptyMessage="Nenhum administrador cadastrado." loadingLabel="Carregando administradores">
          <EmployeeManagementTable
            employees={admins}
            onDelete={setDeleteTarget}
            selection={{ selectedIds: selection.selectedIds, onToggle: selection.toggle, onToggleAll: selection.selectAll }}
          />
        </ManagementContentBody>

        <ManagementContentFooter page={page} totalPages={totalPages} onPageChange={(p) => { goToPage(p); selection.clear() }} />

        <Dialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          title="Novo administrador"
        >
          <EmployeeForm
            value={employeeForm}
            onChange={(patch) => setEmployeeForm((f) => ({ ...f, ...patch }))}
            onSave={() => void handleCreate()}
            onCancel={() => setCreateDialogOpen(false)}
            saving={creating}
          />
        </Dialog>

        <ConfirmDeleteDialog
          open={deleteTarget !== null}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          deleting={deleting}
          title="Excluir administrador"
          description={deleteTargetAdmin ? `Remover "${deleteTargetAdmin.name}"? Essa ação não pode ser desfeita.` : undefined}
        />

        <ConfirmDeleteDialog
          open={bulkDeleteTarget !== null}
          onClose={cancelBulkDelete}
          onConfirm={confirmBulkDelete}
          deleting={bulkDeleting}
          title="Excluir administradores"
          description={bulkDeleteTarget ? `Remover ${bulkDeleteTarget.length} administrador(es) selecionado(s)? Essa ação não pode ser desfeita.` : undefined}
        />
      </ManagementPageBody>
    </Container>
  )
}
