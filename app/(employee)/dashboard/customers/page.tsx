'use client'
import { useCallback, useEffect, useState } from 'react'
import { Button, Heading, Input, Skeleton, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import type { CustomerDetailResponse, CustomerResponse } from '@/types'

export default function ClientesPage() {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()
  const [customers, setCustomers] = useState<CustomerResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CustomerDetailResponse | null>(null)

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

  const handleSelect = async (id: string) => {
    if (!accessToken) return
    try {
      const res = await fetch(`/api/admin/customers/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error()
      setSelected(await res.json())
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao carregar detalhe do cliente.' })
    }
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
        <Button type="submit">Buscar</Button>
      </form>

      {loading ? (
        <div role="status">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="line" height={40} className="mb-2" />
          ))}
        </div>
      ) : (
        <table className="w-full border-collapse text-sm mb-8">
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
                  <Button size="sm" variant="outline" onClick={() => handleSelect(c.id)}>
                    Ver detalhe
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <section aria-label="Detalhe do cliente">
          <div className="flex items-center justify-between mb-4">
            <Heading as="h2" size="xl">
              {selected.name}
            </Heading>
            <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>
              Fechar
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{selected.email}</p>
          <Heading as="h3" size="lg" className="mb-3">
            Endereços
          </Heading>
          {selected.addresses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {selected.addresses.map((a) => (
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
        </section>
      )}
    </main>
    </PermissionGuard>
  )
}
