'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/authFetch'
import { Button, FormField, Icon, Input, Text } from '@indianous/base-ds'
import { useStorefrontSession } from '@/stores/storefront-session'
import type { Address, ShippingQuote } from '@/types'

export function isValidZipCodeFormat(raw: string): boolean {
  return /^\d{5}-?\d{3}$/.test(raw.trim())
}

interface Props {
  productId: string
}

type AddressStatus = 'checking' | 'manual' | 'saved'

function pickDefaultAddress(addresses: Address[]): Address | null {
  if (addresses.length === 0) return null
  return addresses.find((a) => a.isDefault) ?? addresses[0]
}

export function ShippingPreview({ productId }: Props) {
  const { accessToken } = useStorefrontSession()

  const [addressStatus, setAddressStatus] = useState<AddressStatus>(accessToken ? 'checking' : 'manual')
  const [savedAddress, setSavedAddress] = useState<Address | null>(null)

  const [zipCode, setZipCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [freeShipping, setFreeShipping] = useState(false)
  const [options, setOptions] = useState<ShippingQuote[] | null>(null)

  const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const runPreview = async (targetZipCode: string) => {
    setError('')
    setOptions(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/catalog/products/${productId}/shipping-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zipCode: targetZipCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.message ?? 'Erro ao calcular o frete.')
        return
      }
      setFreeShipping(data.freeShipping)
      setOptions(data.options)
    } catch {
      setError('Erro ao calcular o frete.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!accessToken) {
      setAddressStatus('manual')
      return
    }
    setAddressStatus('checking')
    authFetch('/api/addresses')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((addresses: Address[]) => {
        const chosen = pickDefaultAddress(addresses)
        if (!chosen) {
          setAddressStatus('manual')
          return
        }
        setSavedAddress(chosen)
        setAddressStatus('saved')
        runPreview(chosen.zipCode)
      })
      .catch(() => setAddressStatus('manual'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, productId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidZipCodeFormat(zipCode)) {
      setError('CEP inválido')
      setOptions(null)
      return
    }
    await runPreview(zipCode)
  }

  const renderResults = () =>
    options !== null && (
      <div className="flex flex-col gap-1">
        {freeShipping ? (
          <Text size="sm">Frete grátis</Text>
        ) : options.length === 0 ? (
          <Text size="sm" color="muted">Nenhuma opção de frete disponível pra esse CEP.</Text>
        ) : (
          options.map((option) => (
            <Text key={option.serviceId} size="sm">
              {option.carrierName} — {option.serviceName} — {formatBRL(option.price)} — {option.deliveryDays} dia(s)
            </Text>
          ))
        )}
      </div>
    )

  if (addressStatus === 'checking') {
    return null
  }

  if (addressStatus === 'saved' && savedAddress) {
    return (
      <div className="flex flex-col gap-2">
        <Text size="sm" color="muted">
          Frete para {savedAddress.city}/{savedAddress.state} — CEP {savedAddress.zipCode}
        </Text>
        {loading && <Text size="sm" color="muted">Calculando frete...</Text>}
        {error && <Text size="sm" color="destructive">{error}</Text>}
        {!loading && renderResults()}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <FormField label="CEP" id="shipping-preview-zip" error={error || undefined} className="flex-1">
          <Input
            id="shipping-preview-zip"
            placeholder="00000-000"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
          />
        </FormField>
        <Button
          iconOnly
          leftIcon={<Icon name="Truck" size="sm" />}
          aria-label="Calcular frete"
          type="submit"
          variant="secondary"
          isLoading={loading}
        />
      </div>

      {renderResults()}
    </form>
  )
}
