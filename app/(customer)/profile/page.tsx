'use client'

import { useEffect, useState } from 'react'
import { Heading, Text, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import type { Address, User } from '@/types'
import { ChangePasswordForm } from '@/components/forms/ChangePasswordForm'
import { ProfileDataForm } from '@/components/forms/ProfileDataForm'
import { AddressForm, EMPTY_ADDRESS, type NewAddress } from '@/components/forms/AddressForm'

export default function ProfilePage() {
  const { accessToken, setUser } = useAuthStore()
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
      const updated: User = await res.json()
      setName(updated.name)
      setEmail(updated.email)
      setUser(updated)
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
        <ProfileDataForm
          name={name}
          email={email}
          onNameChange={setName}
          onEmailChange={setEmail}
          onSubmit={handleSaveUser}
          saving={savingUser}
        />
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

        <AddressForm
          address={newAddress}
          onChange={(patch) => setNewAddress((a) => ({ ...a, ...patch }))}
          onSubmit={handleAddAddress}
          saving={savingAddress}
        />
      </section>

      <section>
        <Heading as="h2" size="xl" className="mb-4">
          Trocar senha
        </Heading>
        <ChangePasswordForm />
      </section>
    </main>
  )
}
