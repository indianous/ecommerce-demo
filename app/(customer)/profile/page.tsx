'use client'

import { useEffect, useState } from 'react'
import { Button, FormField, Heading, Input, Text, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import type { Address, User } from '@/types'

type NewAddress = Omit<Address, 'id' | 'isDefault'>

const EMPTY_ADDRESS: NewAddress = {
  street: '',
  number: '',
  district: '',
  city: '',
  state: '',
  zipCode: '',
}

export default function ProfilePage() {
  const { accessToken } = useAuthStore()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [savingUser, setSavingUser] = useState(false)

  const [addresses, setAddresses] = useState<Address[]>([])
  const [newAddress, setNewAddress] = useState<NewAddress>(EMPTY_ADDRESS)
  const [savingAddress, setSavingAddress] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: User | null) => {
        if (data) {
          setName(data.name)
          setEmail(data.email)
        }
      })
    fetch('/api/addresses', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then(setAddresses)
  }, [accessToken])

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken) return
    setSavingUser(true)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name, email }),
      })
      if (!res.ok) throw new Error()
      toast({ variant: 'success', description: 'Dados atualizados com sucesso.' })
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao atualizar dados.' })
    } finally {
      setSavingUser(false)
    }
  }

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken) return
    setSavingAddress(true)
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(newAddress),
      })
      if (!res.ok) throw new Error()
      const created: Address = await res.json()
      setAddresses((prev) => [...prev, created])
      setNewAddress(EMPTY_ADDRESS)
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao adicionar endereço.' })
    } finally {
      setSavingAddress(false)
    }
  }

  if (!accessToken) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <Text color="muted">Você precisa entrar na sua conta para ver o perfil.</Text>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 flex flex-col gap-10">
      <section>
        <Heading as="h1" size="2xl" className="mb-6">
          Meus dados
        </Heading>
        <form onSubmit={handleSaveUser} className="flex flex-col gap-4">
          <FormField label="Nome" id="profile-name">
            <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Email" id="profile-email">
            <Input id="profile-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <Button type="submit" isLoading={savingUser} className="self-start">
            Salvar
          </Button>
        </form>
      </section>

      <section>
        <Heading as="h2" size="xl" className="mb-4">
          Endereços
        </Heading>

        {addresses.length === 0 ? (
          <Text color="muted" className="mb-4">
            Nenhum endereço cadastrado.
          </Text>
        ) : (
          <ul className="mb-6 flex flex-col gap-2">
            {addresses.map((addr) => (
              <li key={addr.id}>
                <Text size="sm">
                  {addr.street}, {addr.number} — {addr.district}, {addr.city}/{addr.state} — {addr.zipCode}
                </Text>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAddAddress} className="grid grid-cols-2 gap-4">
          <FormField label="Rua/Logradouro" id="address-street" className="col-span-2">
            <Input
              id="address-street"
              value={newAddress.street}
              onChange={(e) => setNewAddress((a) => ({ ...a, street: e.target.value }))}
              required
            />
          </FormField>
          <FormField label="Número" id="address-number">
            <Input
              id="address-number"
              value={newAddress.number}
              onChange={(e) => setNewAddress((a) => ({ ...a, number: e.target.value }))}
              required
            />
          </FormField>
          <FormField label="Bairro" id="address-district">
            <Input
              id="address-district"
              value={newAddress.district}
              onChange={(e) => setNewAddress((a) => ({ ...a, district: e.target.value }))}
              required
            />
          </FormField>
          <FormField label="Cidade" id="address-city">
            <Input
              id="address-city"
              value={newAddress.city}
              onChange={(e) => setNewAddress((a) => ({ ...a, city: e.target.value }))}
              required
            />
          </FormField>
          <FormField label="Estado" id="address-state">
            <Input
              id="address-state"
              value={newAddress.state}
              onChange={(e) => setNewAddress((a) => ({ ...a, state: e.target.value }))}
              required
            />
          </FormField>
          <FormField label="CEP" id="address-zip" className="col-span-2">
            <Input
              id="address-zip"
              value={newAddress.zipCode}
              onChange={(e) => setNewAddress((a) => ({ ...a, zipCode: e.target.value }))}
              required
            />
          </FormField>
          <Button type="submit" isLoading={savingAddress} className="col-span-2 self-start">
            Adicionar endereço
          </Button>
        </form>
      </section>
    </main>
  )
}
