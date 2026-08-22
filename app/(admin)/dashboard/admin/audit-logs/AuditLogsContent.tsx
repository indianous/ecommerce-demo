'use client'
import { useCallback, useEffect, useState } from 'react'
import { FilterDropdown, Heading, Skeleton, Table, type TableColumn, Text } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { sortTableData } from '@/lib/sortTableData'
import type { AuditAction, AuditEntityType, AuditLogPage, AuditLogResponse } from '@/types'

const ENTITY_TYPE_OPTIONS = [
  { value: 'ORDER', label: 'Pedido' },
  { value: 'PRODUCT', label: 'Produto' },
  { value: 'CATEGORY', label: 'Categoria' },
  { value: 'USER', label: 'Usuário' },
  { value: 'ADDRESS', label: 'Endereço' },
]

const ACTION_OPTIONS = [
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
  { key: 'entityType', header: 'Tipo', sortable: true, render: (log) => ENTITY_TYPE_LABELS[log.entityType] },
  { key: 'entityId', header: 'ID da Entidade', render: (log) => log.entityId },
  { key: 'action', header: 'Ação', sortable: true, render: (log) => ACTION_LABELS[log.action] },
  { key: 'actorEmail', header: 'Ator', sortable: true, render: (log) => log.actorEmail ?? '—' },
  { key: 'actorRole', header: 'Perfil', render: (log) => log.actorRole ?? '—' },
  { key: 'createdAt', header: 'Data', sortable: true, render: (log) => formatDate(log.createdAt) },
]

export function AuditLogsContent() {
  const { accessToken } = useAuthStore()
  const [page, setPage] = useState<AuditLogPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [entityType, setEntityType] = useState<string[]>([])
  const [action, setAction] = useState<string[]>([])
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const fetchLogs = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      entityType.forEach((t) => params.append('entityType', t))
      action.forEach((a) => params.append('action', a))
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
        <FilterDropdown
          label="Tipo de entidade"
          options={ENTITY_TYPE_OPTIONS}
          value={entityType}
          onApply={setEntityType}
        />
        <FilterDropdown
          label="Ação"
          options={ACTION_OPTIONS}
          value={action}
          onApply={setAction}
        />
      </div>

      {loading ? (
        <div role="status" aria-label="Carregando logs">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="line" height={48} className="mb-2" />
          ))}
        </div>
      ) : !page || page.content.length === 0 ? (
        <Text size="sm" color="muted">Nenhum log encontrado.</Text>
      ) : (
        <Table
          columns={columns}
          data={
            sort
              ? sortTableData(
                  page.content,
                  sort.key as keyof AuditLogResponse,
                  sort.direction,
                  sort.key === 'createdAt' ? 'date' : 'string',
                )
              : page.content
          }
          onSort={(key, direction) => setSort({ key, direction })}
        />
      )}
    </div>
  )
}
