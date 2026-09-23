'use client'
import { useCallback, useRef, useState } from 'react'
import { authFetch } from '@/lib/authFetch'
import { Container, FilterDropdown, Table, type TableColumn } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { ManagementPageHeader } from '@/components/layout/ManagementPageHeader'
import { ManagementPageBody } from '@/components/layout/ManagementPageBody'
import { ManagementContentHeader } from '@/components/layout/ManagementContentHeader'
import { ManagementContentBody } from '@/components/layout/ManagementContentBody'
import { ManagementContentFooter } from '@/components/layout/ManagementContentFooter'
import { SelectionBar } from '@/components/layout/SelectionBar'
import { makeSelectionColumn } from '@/components/layout/selectionColumn'
import { sortTableData } from '@/lib/sortTableData'
import { useRowSelection } from '@/lib/useRowSelection'
import { usePaginatedFetch, type PageResult } from '@/lib/usePaginatedFetch'
import type { AuditAction, AuditEntityType, AuditLogResponse } from '@/types'

const ENTITY_TYPE_OPTIONS = [
  { value: 'ORDER', label: 'Pedido' },
  { value: 'PRODUCT', label: 'Produto' },
  { value: 'CATEGORY', label: 'Categoria' },
  { value: 'PROMOTION', label: 'Promoção' },
  { value: 'COUPON', label: 'Cupom' },
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
  PROMOTION: 'Promoção',
  COUPON: 'Cupom',
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
  const searchRef = useRef('')
  const [entityType, setEntityType] = useState<string[]>([])
  const [action, setAction] = useState<string[]>([])
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const fetchPage = useCallback(async (params: URLSearchParams): Promise<PageResult<AuditLogResponse> | null> => {
    if (!accessToken) return null
    entityType.forEach((t) => params.append('entityType', t))
    action.forEach((a) => params.append('action', a))
    if (searchRef.current) params.set('search', searchRef.current)
    try {
      const res = await authFetch(`/api/admin/audit-logs?${params.toString()}`)
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }, [accessToken, entityType, action])

  const { page, items: logs, totalPages, loading, goToPage, reload } = usePaginatedFetch(fetchPage)

  const handleSearch = (value: string) => {
    searchRef.current = value
    reload()
  }

  const selection = useRowSelection()
  const sortedLogs = sort
    ? sortTableData(logs, sort.key as keyof AuditLogResponse, sort.direction, sort.key === 'createdAt' ? 'date' : 'string')
    : logs
  const tableColumns: TableColumn<AuditLogResponse>[] = [
    makeSelectionColumn(sortedLogs, (l) => String(l.id), (l) => `log ${l.entityType} ${l.entityId}`, selection.selectedIds, selection.toggle, selection.selectAll),
    ...columns,
  ]

  return (
    <Container>
      <ManagementPageHeader title="Auditoria" />
      <ManagementPageBody>
        <ManagementContentHeader
          searchId="audit-logs-search"
          searchLabel="Buscar logs"
          searchPlaceholder="Buscar por id da entidade ou e-mail do ator..."
          onSearch={handleSearch}
          filters={
            <>
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
            </>
          }
        />

        <SelectionBar selectedCount={selection.selectedCount} onClear={selection.clear} />

        <ManagementContentBody loading={loading} empty={logs.length === 0} emptyMessage="Nenhum log encontrado." loadingLabel="Carregando logs">
          <Table
            columns={tableColumns}
            data={sortedLogs}
            onSort={(key, direction) => setSort({ key, direction })}
          />
        </ManagementContentBody>

        <ManagementContentFooter page={page} totalPages={totalPages} onPageChange={(p) => { goToPage(p); selection.clear() }} />
      </ManagementPageBody>
    </Container>
  )
}
