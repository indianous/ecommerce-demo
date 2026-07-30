'use client'

import { Heading, Text } from 'base-ds'
import { useAuthStore } from '@/stores/auth.store'

export default function AdminProfilePage() {
  const user = useAuthStore((s) => s.user)

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Heading as="h1" size="2xl" className="mb-6">
        Meu Perfil
      </Heading>

      <section className="flex flex-col gap-4 rounded-lg border border-border p-6">
        <div>
          <Text size="sm" color="muted">Nome</Text>
          <Text weight="medium">{user?.name}</Text>
        </div>
        <div>
          <Text size="sm" color="muted">E-mail</Text>
          <Text>{user?.email}</Text>
        </div>
      </section>
    </main>
  )
}
