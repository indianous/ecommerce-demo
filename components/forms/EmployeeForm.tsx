'use client'

import { useState } from 'react'
import { Button, Input } from 'base-ds'
import type { EmployeeFormData } from '@/types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Props = {
  onSave: (data: EmployeeFormData) => void
  onCancel: () => void
}

export function EmployeeForm({ onSave, onCancel }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const canSubmit = name.trim() !== '' && EMAIL_RE.test(email) && password.length >= 8

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="emp-name" className="block text-sm font-medium mb-1">Nome</label>
        <Input
          id="emp-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="emp-email" className="block text-sm font-medium mb-1">E-mail</label>
        <Input
          id="emp-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="emp-password" className="block text-sm font-medium mb-1">Senha</label>
        <Input
          id="emp-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave({ name, email, password })} disabled={!canSubmit}>Salvar</Button>
      </div>
    </div>
  )
}
