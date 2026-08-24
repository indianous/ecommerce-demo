'use client'

import { useEffect, useState } from 'react'
import { Avatar, Badge, Button, Heading, Icon, Skeleton, TransferList, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { CopyButton } from '@/components/ui/CopyButton'
import { ALL_PERMISSIONS, PERMISSION_LABELS } from '@/lib/permissions'
import type { AuditLogResponse, EmployeeDetailResponse, EmployeePermission } from '@/types'

export function EmployeeDetailPage({ id }: { id: string }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [employee, setEmployee] = useState<EmployeeDetailResponse | null>(null)
  const [permissions, setPermissions] = useState<EmployeePermission[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!accessToken || !id) return
    Promise.all([
      fetch(`/api/admin/employees/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((r) => r.json()),
      fetch(`/api/admin/employees/${id}/audit-logs`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((r) => r.json()),
    ])
      .then(([emp, logs]: [EmployeeDetailResponse, { content: AuditLogResponse[] }]) => {
        setEmployee(emp)
        setPermissions(emp.permissions ?? [])
        setAuditLogs(logs.content ?? [])
      })
      .finally(() => setLoading(false))
  }, [accessToken, id])

  const handleSave = async () => {
    if (!accessToken || !employee) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/employees/${employee.id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ permissions }),
      })
      if (!res.ok) throw new Error()
      toast({ variant: 'success', description: 'Permissões salvas com sucesso.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao salvar permissões.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div role="status">
        <Skeleton variant="line" height={40} className="mb-2" />
        <Skeleton variant="line" height={40} className="mb-2" />
      </div>
    )
  }

  if (!employee) return <p>Funcionário não encontrado.</p>

  const permOptions = ALL_PERMISSIONS.map((p) => ({ value: p, label: PERMISSION_LABELS[p] }))

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Avatar src={employee.photoUrl} alt={employee.name} size="lg" />
        <div>
          <Heading as="h1" size="2xl">
            <span className="inline-flex items-center gap-2">
              {employee.name}
              <CopyButton value={employee.name} label="nome" />
            </span>
          </Heading>
          <p className="text-muted-foreground inline-flex items-center gap-2">
            {employee.email}
            <CopyButton value={employee.email} label="e-mail" />
          </p>
          <Badge variant="default">{employee.role}</Badge>
        </div>
      </div>

      <section className="mb-8">
        <Heading as="h2" size="xl" className="mb-4">
          Permissões
        </Heading>
        <TransferList
          options={permOptions}
          value={permissions}
          onChange={(next) => setPermissions(next as EmployeePermission[])}
          availableLabel="Disponíveis"
          selectedLabel="Atribuídas"
          moveLabel="Mover para Atribuídas"
          moveAllLabel="Mover todos para Atribuídas"
          moveBackLabel="Mover para Disponíveis"
          moveAllBackLabel="Mover todos para Disponíveis"
        />
        <div className="flex gap-2 mt-4">
          <Button iconOnly leftIcon={<Icon name="Save" size="sm" />} aria-label="Salvar permissões" variant="primary" onClick={handleSave} isLoading={saving} />
          <Button variant="secondary" disabled>
            Redefinir senha
          </Button>
        </div>
      </section>

      <section>
        <Heading as="h2" size="xl" className="mb-4">
          Histórico de Ações
        </Heading>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma ação registrada.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {auditLogs.map((log) => (
              <li key={log.id} className="border rounded p-3 text-sm">
                <span className="font-medium">{log.action}</span> em {log.entityType}{' '}
                <span className="text-muted-foreground">{log.entityId}</span>
                <span className="text-muted-foreground ml-2">
                  {new Date(log.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
