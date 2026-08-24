'use client'

import { useCallback, useRef } from 'react'
import Link from 'next/link'
import { Button, Icon, Image, Rating, Table, type TableColumn, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog'
import { ManagementPageHeader } from '@/components/layout/ManagementPageHeader'
import { ManagementPageBody } from '@/components/layout/ManagementPageBody'
import { ManagementContentHeader } from '@/components/layout/ManagementContentHeader'
import { ManagementContentBody } from '@/components/layout/ManagementContentBody'
import { ManagementContentFooter } from '@/components/layout/ManagementContentFooter'
import { useConfirmDelete } from '@/lib/useConfirmDelete'
import { usePaginatedFetch, type PageResult } from '@/lib/usePaginatedFetch'
import type { ProductReview } from '@/types'

interface Props {
  id: string
  basePath?: string
}

export function ProductReviewsModerationContent({ id, basePath = '/dashboard/products' }: Props) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const searchRef = useRef('')

  const fetchPage = useCallback(async (params: URLSearchParams): Promise<PageResult<ProductReview> | null> => {
    if (searchRef.current) params.set('search', searchRef.current)
    const res = await fetch(`/api/products/${id}/reviews?${params}`)
    if (!res.ok) return null
    return await res.json()
  }, [id])

  const { page, items: reviews, setItems: setReviews, totalPages, loading, goToPage, reload } = usePaginatedFetch(fetchPage)

  const handleSearch = (value: string) => {
    searchRef.current = value
    reload()
  }

  const handleDeleteReview = async (review: ProductReview) => {
    if (!accessToken) return
    const res = await fetch(`/api/admin/products/${id}/reviews/${review.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      toast({ variant: 'destructive', description: 'Erro ao remover avaliação.' })
      throw new Error()
    }
    setReviews((prev) => prev.filter((r) => r.id !== review.id))
    toast({ variant: 'success', description: 'Avaliação removida.' })
  }

  const {
    target: reviewToDelete,
    setTarget: setReviewToDelete,
    deleting,
    confirm: confirmDelete,
    cancel: cancelDelete,
  } = useConfirmDelete(handleDeleteReview)

  const columns: TableColumn<ProductReview>[] = [
    { key: 'userName', header: 'Nome', sortable: true, render: (r) => r.userName },
    { key: 'rating', header: 'Nota', sortable: true, render: (r) => <Rating value={r.rating} readOnly size="sm" /> },
    {
      key: 'comment',
      header: 'Comentário',
      render: (r) => (
        <div className="flex flex-col gap-2 max-w-xs">
          {r.comment && <span>{r.comment}</span>}
          {r.imageUrls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {r.imageUrls.map((url) => (
                <Image key={url} src={url} alt={`Foto enviada por ${r.userName}`} aspectRatio="square" objectFit="cover" className="w-12 h-12 rounded" />
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Data',
      sortable: true,
      render: (r) => new Intl.DateTimeFormat('pt-BR').format(new Date(r.createdAt)),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (r) => (
        <Button iconOnly leftIcon={<Icon name="Trash2" size="sm" />} aria-label={`Remover avaliação de ${r.userName}`} variant="danger" size="sm" onClick={() => setReviewToDelete(r)} />
      ),
    },
  ]

  return (
    <PermissionGuard permissions={['MANAGE_PRODUCTS']}>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <ManagementPageHeader title="Avaliações do produto" />
        <ManagementPageBody
          actions={
            <Link href={`${basePath}/${id}/edit`} className="text-sm underline self-center">
              Voltar para o produto
            </Link>
          }
        >
          <ManagementContentHeader
            searchId="product-reviews-search"
            searchLabel="Buscar avaliações"
            searchPlaceholder="Buscar por nome de quem avaliou..."
            onSearch={handleSearch}
          />

          <ManagementContentBody loading={loading} empty={reviews.length === 0} emptyMessage="Nenhuma avaliação para este produto." loadingLabel="Carregando avaliações">
            <Table columns={columns} data={reviews} />
          </ManagementContentBody>

          <ManagementContentFooter page={page} totalPages={totalPages} onPageChange={goToPage} />
        </ManagementPageBody>

        <ConfirmDeleteDialog
          open={reviewToDelete !== null}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          deleting={deleting}
          title="Remover avaliação"
          description="Essa ação não pode ser desfeita."
        />
      </main>
    </PermissionGuard>
  )
}
