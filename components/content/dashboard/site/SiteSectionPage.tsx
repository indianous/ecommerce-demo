'use client'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Container, Heading, Skeleton } from '@indianous/base-ds'
import { PermissionGuard } from '@/components/employee/PermissionGuard'

interface Props {
  title: string
  /** Para onde o "← Voltar" leva (índice da gestão do site no shell atual). */
  backPath: string
  loading?: boolean
  children: ReactNode
}

/** Casca comum das páginas de gestão do site: permissão, voltar, título e carregamento. */
export function SiteSectionPage({ title, backPath, loading = false, children }: Props) {
  return (
    <PermissionGuard permissions={['MANAGE_SITE']}>
      <Container>
        <div className="mb-6 flex items-center gap-4">
          <Link href={backPath} className="text-sm text-muted-foreground hover:underline">
            ← Voltar
          </Link>
          <Heading as="h1" size="2xl">{title}</Heading>
        </div>

        {loading ? (
          <div role="status">
            <Skeleton variant="line" height={40} className="mb-4" />
            <Skeleton variant="line" height={120} />
          </div>
        ) : (
          children
        )}
      </Container>
    </PermissionGuard>
  )
}
