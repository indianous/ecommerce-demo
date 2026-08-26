'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/authFetch'
import { Heading, Text, useToast } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'
import type { Address, Gender, User } from '@/types'
import { ChangePasswordForm } from '@/components/forms/ChangePasswordForm'
import { ProfileDataForm } from '@/components/forms/ProfileDataForm'
import { AddressForm, EMPTY_ADDRESS, type NewAddress } from '@/components/forms/AddressForm'

export function CustomerProfileContent() {
  const { accessToken, setUser } = useAuthStore()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<Gender>('PREFIRO_NAO_DIZER')
  const [cpf, setCpf] = useState('')
  const [savingUser, setSavingUser] = useState(false)

  const [addresses, setAddresses] = useState<Address[]>([])
  const [newAddress, setNewAddress] = useState<NewAddress>(EMPTY_ADDRESS)
  const [savingAddress, setSavingAddress] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    authFetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: User | null) => {
        if (data) {
          setName(data.name)
          setEmail(data.email)
          setPhone(data.phone ?? '')
          setBirthDate(data.birthDate ?? '')
          setGender(data.gender)
          setCpf(data.cpf ?? '')
        }
      })
    authFetch('/api/addresses')
      .then((res) => (res.ok ? res.json() : []))
      .then(setAddresses)
  }, [accessToken])

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken) return
    setSavingUser(true)
    try {
      const res = await authFetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({
          name, email, phone: phone || null, birthDate: birthDate || null, gender, cpf: cpf || null,
        }),
      })
      if (!res.ok) throw new Error()
      const updated: User = await res.json()
      setName(updated.name)
      setEmail(updated.email)
      setPhone(updated.phone ?? '')
      setBirthDate(updated.birthDate ?? '')
      setGender(updated.gender)
      setCpf(updated.cpf ?? '')
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
      const res = await authFetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
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
          phone={phone}
          birthDate={birthDate}
          gender={gender}
          cpf={cpf}
          onNameChange={setName}
          onEmailChange={setEmail}
          onPhoneChange={setPhone}
          onBirthDateChange={setBirthDate}
          onGenderChange={setGender}
          onCpfChange={setCpf}
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
