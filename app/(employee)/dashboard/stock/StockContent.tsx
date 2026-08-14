'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Dialog, Heading, useToast } from 'base-ds'
import { IconButton } from '@/components/ui/IconButton'
import { useAuthStore } from '@/stores/auth.store'
import { PermissionGuard } from '@/components/employee/PermissionGuard'
import { StockEntryForm } from '@/components/forms/StockEntryForm'
import { StockExitForm } from '@/components/forms/StockExitForm'
import type { AdminProductPage, Product, StockLot, StockLotPage, StockMovementReason } from '@/types'

interface Props {
  stockBasePath?: string
}

export function StockContent({ stockBasePath = '/dashboard/stock' }: Props) {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(() => Boolean(accessToken))

  const [entryProductId, setEntryProductId] = useState<string | null>(null)
  const [entryReason, setEntryReason] = useState<StockMovementReason>('PURCHASE')
  const [entryQuantity, setEntryQuantity] = useState(1)
  const [entryNote, setEntryNote] = useState('')
  const [entryLotNumber, setEntryLotNumber] = useState('')
  const [entryExpiryDate, setEntryExpiryDate] = useState('')
  const [entrySaving, setEntrySaving] = useState(false)

  const [exitProductId, setExitProductId] = useState<string | null>(null)
  const [exitLots, setExitLots] = useState<StockLot[]>([])
  const [exitReason, setExitReason] = useState<StockMovementReason>('LOSS_DAMAGE')
  const [exitLotId, setExitLotId] = useState('')
  const [exitQuantity, setExitQuantity] = useState(1)
  const [exitNote, setExitNote] = useState('')
  const [exitSaving, setExitSaving] = useState(false)

  const fetchProducts = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/products?active=true', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const data: AdminProductPage = await res.json()
        setProducts(data.content)
      }
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const authHeader = () => ({ Authorization: `Bearer ${accessToken}` })

  const openEntryDialog = (productId: string) => {
    setEntryReason('PURCHASE')
    setEntryQuantity(1)
    setEntryNote('')
    setEntryLotNumber('')
    setEntryExpiryDate('')
    setEntryProductId(productId)
  }

  const closeEntryDialog = () => setEntryProductId(null)

  const handleEntrySave = async () => {
    if (!accessToken || !entryProductId) return
    setEntrySaving(true)
    try {
      const res = await fetch(`/api/admin/products/${entryProductId}/stock-movements/entries`, {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: entryReason,
          quantity: entryQuantity,
          note: entryNote || undefined,
          lotNumber: entryLotNumber || undefined,
          expiryDate: entryExpiryDate || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast({ variant: 'destructive', description: data?.message ?? 'Erro ao registrar entrada.' })
        return
      }
      closeEntryDialog()
      toast({ variant: 'success', description: 'Entrada registrada com sucesso.' })
      fetchProducts()
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao registrar entrada.' })
    } finally {
      setEntrySaving(false)
    }
  }

  const openExitDialog = async (productId: string) => {
    if (!accessToken) return
    setExitReason('LOSS_DAMAGE')
    setExitLotId('')
    setExitQuantity(1)
    setExitNote('')
    setExitLots([])
    setExitProductId(productId)
    const res = await fetch(`/api/admin/products/${productId}/stock-lots`, {
      headers: authHeader(),
    })
    if (res.ok) {
      const data: StockLotPage = await res.json()
      setExitLots((data.content ?? []).filter((lot) => lot.quantity > 0))
    }
  }

  const closeExitDialog = () => setExitProductId(null)

  const handleExitSave = async () => {
    if (!accessToken || !exitProductId) return
    setExitSaving(true)
    try {
      const res = await fetch(`/api/admin/products/${exitProductId}/stock-movements/exits`, {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: exitReason,
          lotId: exitLotId,
          quantity: exitQuantity,
          note: exitNote || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast({ variant: 'destructive', description: data?.message ?? 'Erro ao registrar saída.' })
        return
      }
      closeExitDialog()
      toast({ variant: 'success', description: 'Saída registrada com sucesso.' })
      fetchProducts()
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao registrar saída.' })
    } finally {
      setExitSaving(false)
    }
  }

  if (loading) return <main className="px-4 py-8"><p>Carregando produtos...</p></main>

  return (
    <PermissionGuard permissions={['MANAGE_STOCK']}>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Heading as="h1" size="2xl">Gestão de Estoque</Heading>
          <Link href={`${stockBasePath}/expiring`} className="text-sm underline">
            Lotes vencendo
          </Link>
        </div>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 border-b">Produto</th>
              <th className="text-left p-2 border-b">Categoria</th>
              <th className="text-left p-2 border-b">Quantidade</th>
              <th className="text-left p-2 border-b"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="p-2">{p.name}</td>
                <td className="p-2">{p.categories[0]?.name}</td>
                <td className="p-2">{p.stockQuantity}</td>
                <td className="p-2">
                  <div className="flex items-center gap-3">
                    <IconButton
                      icon="ArrowDownToLine"
                      label="Entrada"
                      variant="primary"
                      size="sm"
                      onClick={() => openEntryDialog(p.id)}
                    />
                    <IconButton
                      icon="ArrowUpFromLine"
                      label="Saída"
                      variant="outline"
                      size="sm"
                      onClick={() => openExitDialog(p.id)}
                    />
                    <Link href={`${stockBasePath}/${p.id}`} className="text-sm underline">Histórico</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>

      <Dialog open={entryProductId !== null} onClose={closeEntryDialog} title="Registrar entrada">
        <StockEntryForm
          reason={entryReason}
          quantity={entryQuantity}
          note={entryNote}
          lotNumber={entryLotNumber}
          expiryDate={entryExpiryDate}
          onReason={setEntryReason}
          onQuantity={setEntryQuantity}
          onNote={setEntryNote}
          onLotNumber={setEntryLotNumber}
          onExpiryDate={setEntryExpiryDate}
          onSave={handleEntrySave}
          saving={entrySaving}
        />
      </Dialog>

      <Dialog open={exitProductId !== null} onClose={closeExitDialog} title="Registrar saída">
        <StockExitForm
          lots={exitLots}
          reason={exitReason}
          lotId={exitLotId}
          quantity={exitQuantity}
          note={exitNote}
          onReason={setExitReason}
          onLotId={setExitLotId}
          onQuantity={setExitQuantity}
          onNote={setExitNote}
          onSave={handleExitSave}
          saving={exitSaving}
        />
      </Dialog>
    </PermissionGuard>
  )
}
