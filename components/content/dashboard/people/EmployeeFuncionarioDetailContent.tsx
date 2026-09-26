'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/authFetch'
import Link from 'next/link'
import { Avatar, Badge, Button, Container, Heading, Icon, Skeleton, TransferList, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { CopyButton } from '@/components/ui/CopyButton'
import { AccountStatusBadges } from '@/components/admin/AccountStatusBadges'
import { MfaResetButton } from '@/components/admin/MfaResetButton'
import { MfaStatusBadge } from '@/components/admin/MfaStatusBadge'
import { PasswordInviteButton } from '@/components/admin/PasswordInviteButton'
import { ALL_PERMISSIONS, PERMISSION_LABELS, canResetMfa, canSendPasswordInvite } from '@/lib/permissions'
import type { AuditLogResponse, EmployeeDetailResponse, EmployeePermission } from '@/types'

export function EmployeeFuncionarioDetailContent({ id, backPath = '/dashboard/employees' }: { id: string; backPath?: string }) {
  const { accessToken } = useAuthStore()
  const currentUser = useAuthStore((s) => s.user)
  const { toast } = useToast()
  const [employee, setEmployee] = useState<EmployeeDetailResponse | null>(null)
  const [permissions, setPermissions] = useState<EmployeePermission[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!accessToken || !id) return
    Promise.all([
      authFetch(`/api/admin/employees/${id}`).then((r) => (r.ok ? r.json() : null)),
      authFetch(`/api/admin/employees/${id}/audit-logs`).then((r) => (r.ok ? r.json() : { content: [] })),
    ])
      .then(([emp, logs]: [EmployeeDetailResponse | null, { content: AuditLogResponse[] }]) => {
        setEmployee(emp)
        setPermissions(emp?.permissions ?? [])
        setAuditLogs(logs.content ?? [])
      })
      .finally(() => setLoading(false))
  }, [accessToken, id])

  const handleSave = async () => {
    if (!accessToken || !employee) return
    setSaving(true)
    try {
      const res = await authFetch(`/api/admin/employees/${employee.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', },
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
    <PermissionGuard permissions={['MANAGE_EMPLOYEES']}>
      <Container>
        <div className="mb-6 flex items-center gap-4">
          <Link href={backPath} className="text-sm text-muted-foreground hover:underline">
            ← Voltar
          </Link>
        </div>

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
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="default">{employee.role}</Badge>
              <AccountStatusBadges passwordSet={employee.passwordSet} emailVerified={employee.emailVerified} />
              <MfaStatusBadge mfaEnabled={employee.mfaEnabled} role={employee.role} />
              <PasswordInviteButton
                userId={employee.id}
                email={employee.email}
                passwordSet={employee.passwordSet}
                canInvite={canSendPasswordInvite(currentUser, employee.role)}
              />
              <MfaResetButton
                userId={employee.id}
                name={employee.name}
                mfaEnabled={employee.mfaEnabled}
                canReset={canResetMfa(currentUser, { id: employee.id, role: employee.role })}
                onReset={() => setEmployee((current) => (current ? { ...current, mfaEnabled: false } : current))}
              />
            </div>
          </div>
        </div>

        <section className="mb-8">
          <Heading as="h2" size="xl" className="mb-4">Permissões</Heading>
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
            <Button leftIcon={<Icon name="Save" size="sm" />} variant="primary" onClick={handleSave} isLoading={saving}>Salvar permissões</Button>
            <Button variant="secondary" disabled>
              Redefinir senha
            </Button>
          </div>
        </section>

        <section>
          <Heading as="h2" size="xl" className="mb-4">Histórico de Ações</Heading>
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
      </Container>
    </PermissionGuard>
  )
}
