'use client'
import { useCallback, useEffect, useState } from 'react'
import { FormField, Heading, Select, Skeleton, Table, type TableColumn } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import type { AuditAction, AuditEntityType, AuditLogPage, AuditLogResponse } from '@/types'

const ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'ORDER', label: 'Pedido' },
  { value: 'PRODUCT', label: 'Produto' },
  { value: 'CATEGORY', label: 'Categoria' },
  { value: 'USER', label: 'Usuário' },
  { value: 'ADDRESS', label: 'Endereço' },
]

const ACTION_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'CREATED', label: 'Criação' },
  { value: 'UPDATED', label: 'Atualização' },
  { value: 'DELETED', label: 'Exclusão' },
  { value: 'DEACTIVATED', label: 'Desativação' },
  { value: 'STATUS_UPDATED', label: 'Status atualizado' },
  { value: 'PASSWORD_CHANGED', label: 'Senha alterada' },
]

const ACTION_LABELS: Record<AuditAction, string> = {
  CREATED: 'Criação',
  UPDATED: 'Atualização',
  DELETED: 'Exclusão',
  DEACTIVATED: 'Desativação',
  STATUS_UPDATED: 'Status atualizado',
  PASSWORD_CHANGED: 'Senha alterada',
}

const ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  ORDER: 'Pedido',
  PRODUCT: 'Produto',
  CATEGORY: 'Categoria',
  USER: 'Usuário',
  ADDRESS: 'Endereço',
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))

const columns: TableColumn<AuditLogResponse>[] = [
  { key: 'entityType', header: 'Tipo', render: (log) => ENTITY_TYPE_LABELS[log.entityType] },
  { key: 'entityId', header: 'ID da Entidade', render: (log) => log.entityId },
  { key: 'action', header: 'Ação', render: (log) => ACTION_LABELS[log.action] },
  { key: 'actorEmail', header: 'Ator', render: (log) => log.actorEmail ?? '—' },
  { key: 'actorRole', header: 'Perfil', render: (log) => log.actorRole ?? '—' },
  { key: 'createdAt', header: 'Data', render: (log) => formatDate(log.createdAt) },
]

export default function AuditLogsPage() {
  const { accessToken } = useAuthStore()
  const [page, setPage] = useState<AuditLogPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [entityType, setEntityType] = useState('')
  const [action, setAction] = useState('')

  const fetchLogs = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (entityType) params.set('entityType', entityType)
      if (action) params.set('action', action)
      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      setPage(await res.json())
    } catch {
      // empty state handles no data
    } finally {
      setLoading(false)
    }
  }, [accessToken, entityType, action])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return (
    <div>
      <Heading as="h1" size="2xl" className="mb-6">
        Auditoria
      </Heading>

      <div className="flex gap-4 mb-6">
        <FormField label="Tipo de entidade" id="filter-entity-type">
          <Select
            id="filter-entity-type"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            options={ENTITY_TYPE_OPTIONS}
          />
        </FormField>

        <FormField label="Ação" id="filter-action">
          <Select
            id="filter-action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            options={ACTION_OPTIONS}
          />
        </FormField>
      </div>

      {loading ? (
        <div role="status" aria-label="Carregando logs">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="line" height={48} className="mb-2" />
          ))}
        </div>
      ) : !page || page.content.length === 0 ? (
        <p>Nenhum log encontrado.</p>
      ) : (
        <Table columns={columns} data={page.content} />
      )}
    </div>
  )
}
