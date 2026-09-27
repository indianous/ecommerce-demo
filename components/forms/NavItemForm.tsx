'use client'

import { Button, FormField, Icon, Input, Select } from '@indianous/base-ds'
import type { NavPlacement, SiteNavItemType } from '@/types'

export type NavItemFormState = {
  type: SiteNavItemType
  label: string
  url: string
  placement: NavPlacement | ''
}

export const EMPTY_NAV_ITEM_FORM: NavItemFormState = {
  type: 'LINK',
  label: '',
  url: '',
  placement: '',
}

const TYPE_OPTIONS: { value: SiteNavItemType; label: string }[] = [
  { value: 'LINK', label: 'Link direto' },
  { value: 'COLLECTION', label: 'Coleção' },
]

const PLACEMENT_OPTIONS: { value: NavPlacement; label: string }[] = [
  { value: 'NAVBAR', label: 'Navbar' },
  { value: 'FOOTER', label: 'Footer' },
  { value: 'BOTH', label: 'Ambos' },
]

type Props = {
  form: NavItemFormState
  onFormChange: (patch: Partial<NavItemFormState>) => void
  onSubmit: (e: React.FormEvent) => void
  saving: boolean
  isChild?: boolean
  saveLabel?: string
}

export function NavItemForm({ form, onFormChange, onSubmit, saving, isChild = false, saveLabel = 'Salvar' }: Props) {
  const requiresUrl = isChild || form.type === 'LINK'
  const requiresPlacement = !isChild

  const labelMissing = !form.label.trim()
  const urlMissing = requiresUrl && !form.url.trim()
  const placementMissing = requiresPlacement && !form.placement
  const urlFormatInvalid = requiresUrl && form.url.trim() !== '' && !/^https?:\/\//i.test(form.url.trim())

  const urlError = urlFormatInvalid ? 'URL deve começar com http:// ou https://' : undefined
  const canSubmit = !labelMissing && !urlMissing && !placementMissing && !urlFormatInvalid

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {!isChild && (
        <FormField label="Tipo" id="nav-item-type">
          <Select
            id="nav-item-type"
            value={form.type}
            onChange={(e) => onFormChange({ type: e.target.value as SiteNavItemType })}
            options={TYPE_OPTIONS}
          />
        </FormField>
      )}

      <FormField label="Label" id="nav-item-label">
        <Input
          id="nav-item-label"
          value={form.label}
          onChange={(e) => onFormChange({ label: e.target.value })}
          required
        />
      </FormField>

      {requiresUrl && (
        <FormField label="URL" id="nav-item-url" error={urlError}>
          <Input
            id="nav-item-url"
            value={form.url}
            onChange={(e) => onFormChange({ url: e.target.value })}
            placeholder="https://"
          />
        </FormField>
      )}

      {requiresPlacement && (
        <FormField label="Local de exibição" id="nav-item-placement">
          <Select
            id="nav-item-placement"
            value={form.placement}
            onChange={(e) => onFormChange({ placement: e.target.value as NavPlacement })}
            placeholder="Selecione onde aparece"
            options={PLACEMENT_OPTIONS}
          />
        </FormField>
      )}

      <Button leftIcon={<Icon name="Save" size="sm" />} type="submit" variant="primary" isLoading={saving} disabled={!canSubmit} className="self-start">{saveLabel}</Button>
    </form>
  )
}
