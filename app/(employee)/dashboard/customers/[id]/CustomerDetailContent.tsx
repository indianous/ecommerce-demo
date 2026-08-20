'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge, Heading, Image, Rating, Skeleton, Text, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { calculateAge } from '@/lib/age'
import { formatBRL } from '@/lib/format'
import type { CustomerDetailResponse, Gender, OrderStatus } from '@/types'

const GENDER_LABELS: Record<Gender, string> = {
  FEMININO: 'Feminino',
  MASCULINO: 'Masculino',
  NAO_BINARIO: 'Não-binário',
  PREFIRO_NAO_DIZER: 'Prefiro não dizer',
}

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  SHIPPED: 'Enviado',
  RETURNED: 'Devolvido',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}

const ORDER_STATUS_BADGE_VARIANT: Record<OrderStatus, 'warning' | 'info' | 'primary' | 'success' | 'danger'> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  SHIPPED: 'primary',
  RETURNED: 'warning',
  DELIVERED: 'success',
  CANCELLED: 'danger',
}

function formatDate(value: string | null): string {
  if (!value) return 'Não informado'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function formatDateTime(value: string | null): string {
  // Só extrai a data (sem hora), sem passar por Date/Intl — evita
  // deslocar o dia por conversão de fuso horário (ex.: 2026-08-10T00:00:00Z
  // vira 09/08 em UTC-3 se convertido pro horário local).
  if (!value) return 'Não informado'
  return formatDate(value.slice(0, 10))
}

export function CustomerDetailContent({ id, backPath = '/dashboard/customers' }: { id: string; backPath?: string }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [customer, setCustomer] = useState<CustomerDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accessToken) return
    fetch(`/api/admin/customers/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setCustomer(data)
        setLoading(false)
      })
      .catch(() => {
        toast({ variant: 'destructive', description: 'Erro ao carregar cliente.' })
        setLoading(false)
      })
  }, [accessToken, id, toast])

  if (loading) {
    return (
      <div role="status">
        <Skeleton variant="line" height={40} className="mb-2" />
        <Skeleton variant="line" height={40} className="mb-2" />
      </div>
    )
  }

  if (!customer) return <p>Cliente não encontrado.</p>

  return (
    <PermissionGuard permissions={['MANAGE_CUSTOMERS']}>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link href={backPath} className="text-sm text-muted-foreground hover:underline">
            ← Voltar
          </Link>
          <Heading as="h1" size="2xl">{customer.name}</Heading>
        </div>

        <p className="text-sm text-muted-foreground mb-6">{customer.email}</p>

        <Heading as="h2" size="xl" className="mb-3">Dados pessoais</Heading>
        <dl className="mb-6 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Telefone</dt>
            <dd>{customer.phone ?? 'Não informado'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Data de nascimento</dt>
            <dd>{formatDate(customer.birthDate)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Idade</dt>
            <dd>{calculateAge(customer.birthDate) ?? 'Não informado'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Gênero</dt>
            <dd>{GENDER_LABELS[customer.gender]}</dd>
          </div>
        </dl>

        <Heading as="h2" size="xl" className="mb-3">Endereços</Heading>

        {customer.addresses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {customer.addresses.map((a) => (
              <li key={a.id} className="border rounded p-3 text-sm">
                <p>
                  {a.street}, {a.number}
                  {a.complement ? `, ${a.complement}` : ''}
                </p>
                <p>
                  {a.district} — {a.city}/{a.state}
                </p>
                <p>CEP: {a.zipCode}</p>
              </li>
            ))}
          </ul>
        )}

        <Heading as="h2" size="xl" className="mb-3 mt-6">Histórico de compras</Heading>
        <dl className="mb-6 grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Total de pedidos</dt>
            <dd>{customer.purchaseSummary.totalOrders}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Total gasto</dt>
            <dd>{formatBRL(customer.purchaseSummary.totalSpent)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Última compra</dt>
            <dd>{formatDateTime(customer.purchaseSummary.lastPurchaseAt)}</dd>
          </div>
        </dl>

        {customer.recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-6">Nenhuma compra ainda.</p>
        ) : (
          <ul className="mb-6 flex flex-col gap-2">
            {customer.recentOrders.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-2 border rounded p-3 text-sm">
                <span>#{order.orderNumber}</span>
                <Badge variant={ORDER_STATUS_BADGE_VARIANT[order.status]} size="sm">
                  {ORDER_STATUS_LABELS[order.status]}
                </Badge>
                <span>{formatBRL(order.totalAmount)}</span>
              </li>
            ))}
          </ul>
        )}

        <Heading as="h2" size="xl" className="mb-3">Avaliações</Heading>
        {customer.reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma avaliação ainda.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {customer.reviews.map((review) => (
              <li key={review.id} className="border rounded p-3 text-sm flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Text weight="bold" size="sm">{review.productName}</Text>
                  <Rating value={review.rating} readOnly size="sm" />
                </div>
                {review.comment && <Text size="sm">{review.comment}</Text>}
              </li>
            ))}
          </ul>
        )}

        <Heading as="h2" size="xl" className="mb-3 mt-6">Favoritos</Heading>
        {customer.wishlist.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum favorito ainda.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {customer.wishlist.map((item) => (
              <li key={item.productId} className="border rounded p-3 text-sm flex flex-col gap-1">
                {item.imageUrl && (
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    aspectRatio="square"
                    objectFit="contain"
                    className="rounded"
                  />
                )}
                <Text weight="bold" size="sm">{item.productName}</Text>
                <Text size="sm">{formatBRL(item.price)}</Text>
                <Text size="xs" color="muted">{formatDateTime(item.addedAt)}</Text>
              </li>
            ))}
          </ul>
        )}

        <Heading as="h2" size="xl" className="mb-3 mt-6">Carrinho atual</Heading>
        {customer.currentCart.length === 0 ? (
          <p className="text-sm text-muted-foreground">Carrinho vazio no momento.</p>
        ) : (
          <>
            <ul className="mb-3 flex flex-col gap-2">
              {customer.currentCart.map((item) => (
                <li key={item.productId} className="flex items-center justify-between gap-2 border rounded p-3 text-sm">
                  <span>{item.productName}</span>
                  <span>Qtd: {item.quantity}</span>
                  <span>{formatBRL(item.subtotal)}</span>
                </li>
              ))}
            </ul>
            <Text weight="bold" size="sm">Total: {formatBRL(customer.cartTotal)}</Text>
          </>
        )}

        <Heading as="h2" size="xl" className="mb-3 mt-6">Comportamento e tráfego</Heading>

        {!customer.trafficSource ? (
          <p className="text-sm text-muted-foreground mb-6">Origem não identificada.</p>
        ) : (
          <dl className="mb-6 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Origem (UTM Source)</dt>
              <dd>{customer.trafficSource.utmSource ?? 'Acesso direto'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Mídia (UTM Medium)</dt>
              <dd>{customer.trafficSource.utmMedium ?? 'Não informado'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Campanha (UTM Campaign)</dt>
              <dd>{customer.trafficSource.utmCampaign ?? 'Não informado'}</dd>
            </div>
          </dl>
        )}

        <Heading as="h2" size="xl" className="mb-3">Páginas visitadas recentes</Heading>
        {customer.recentPageViews.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-6">Nenhuma navegação registrada.</p>
        ) : (
          <ul className="mb-6 flex flex-col gap-2">
            {customer.recentPageViews.map((pageView, index) => (
              <li key={index} className="flex items-center justify-between gap-2 border rounded p-3 text-sm">
                <span>{pageView.path}</span>
                <span>{formatDateTime(pageView.viewedAt)}</span>
              </li>
            ))}
          </ul>
        )}

        <Heading as="h2" size="xl" className="mb-3">Produtos vistos recentemente</Heading>
        {customer.recentlyViewedProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum produto visualizado ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {customer.recentlyViewedProducts.map((product) => (
              <li key={product.productId} className="flex items-center justify-between gap-2 border rounded p-3 text-sm">
                <Link href={`/catalog/${product.productSlug}`} className="hover:underline">
                  {product.productName}
                </Link>
                <span>{formatDateTime(product.viewedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </PermissionGuard>
  )
}
