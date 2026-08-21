'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Heading, Icon, Input, Skeleton, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import type { CustomerResponse } from '@/types'

export function CustomersContent({ basePath = '/dashboard/customers' }: { basePath?: string }) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const router = useRouter()
  const [customers, setCustomers] = useState<CustomerResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchCustomers = useCallback(
    async (q: string) => {
      if (!accessToken) return
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (q) params.set('search', q)
        const res = await fetch(`/api/admin/customers?${params}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        setCustomers(data.content ?? data)
      } catch {
        toast({ variant: 'destructive', description: 'Erro ao carregar clientes.' })
      } finally {
        setLoading(false)
      }
    },
    [accessToken, toast],
  )

  useEffect(() => {
    fetchCustomers('')
  }, [fetchCustomers])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchCustomers(search)
  }

  return (
    <PermissionGuard permissions={['MANAGE_CUSTOMERS']}>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Heading as="h1" size="2xl" className="mb-6">
          Gestão de Clientes
        </Heading>

        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar clientes"
          />
          <Button iconOnly leftIcon={<Icon name="Search" size="sm" />} aria-label="Buscar" type="submit" variant="primary" />
        </form>

        {loading ? (
          <div role="status">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="line" height={40} className="mb-2" />
            ))}
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="text-left p-2 border-b">Nome</th>
                <th className="text-left p-2 border-b">E-mail</th>
                <th className="text-left p-2 border-b">Ações</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b hover:bg-muted/50">
                  <td className="p-2">{c.name}</td>
                  <td className="p-2">{c.email}</td>
                  <td className="p-2">
                    <Button iconOnly leftIcon={<Icon name="Eye" size="sm" />} aria-label="Ver detalhe" size="sm" variant="outline" onClick={() => router.push(basePath + '/' + c.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </PermissionGuard>
  )
}
