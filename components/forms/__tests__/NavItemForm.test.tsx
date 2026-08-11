import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NavItemForm, EMPTY_NAV_ITEM_FORM, type NavItemFormState } from '../NavItemForm'

function renderForm(overrides: Partial<React.ComponentProps<typeof NavItemForm>> = {}) {
  const props: React.ComponentProps<typeof NavItemForm> = {
    form: EMPTY_NAV_ITEM_FORM,
    onFormChange: vi.fn(),
    onSubmit: vi.fn((e) => e.preventDefault()),
    saving: false,
    ...overrides,
  }
  return { ...render(<NavItemForm {...props} />), props }
}

describe('NavItemForm — tipo "Link direto"', () => {
  it('exige label, URL e local de exibição — botão desabilitado até preencher tudo', () => {
    const form: NavItemFormState = { ...EMPTY_NAV_ITEM_FORM, type: 'LINK' }
    renderForm({ form })

    expect(screen.getByRole('button', { name: /salvar/i })).toBeDisabled()

    expect(screen.getByLabelText(/label/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^url$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/local de exibição/i)).toBeInTheDocument()
  })

  it('com label, URL válida e local de exibição preenchidos, o botão fica habilitado', () => {
    const form: NavItemFormState = {
      type: 'LINK', label: 'Contato', url: 'https://loja.com/contact', placement: 'NAVBAR',
    }
    renderForm({ form })

    expect(screen.getByRole('button', { name: /salvar/i })).not.toBeDisabled()
  })
})

describe('NavItemForm — tipo "Coleção"', () => {
  it('exige só label e local de exibição — sem campo de URL', () => {
    const form: NavItemFormState = { type: 'COLLECTION', label: '', url: '', placement: '' }
    renderForm({ form })

    expect(screen.queryByLabelText(/^url$/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /salvar/i })).toBeDisabled()
  })

  it('com label e local de exibição preenchidos, o botão fica habilitado', () => {
    const form: NavItemFormState = { type: 'COLLECTION', label: 'Institucional', url: '', placement: 'FOOTER' }
    renderForm({ form })

    expect(screen.getByRole('button', { name: /salvar/i })).not.toBeDisabled()
  })
})

describe('NavItemForm — validação de URL', () => {
  it('URL sem http(s):// mostra erro de validação antes do submit', () => {
    const form: NavItemFormState = {
      type: 'LINK', label: 'Contato', url: 'loja.com/contact', placement: 'NAVBAR',
    }
    renderForm({ form })

    expect(screen.getByRole('alert')).toHaveTextContent(/http/i)
    expect(screen.getByRole('button', { name: /salvar/i })).toBeDisabled()
  })
})

describe('NavItemForm — link filho de uma coleção (isChild)', () => {
  it('não mostra seletor de tipo nem de local de exibição, mas exige URL', () => {
    const form: NavItemFormState = { type: 'LINK', label: '', url: '', placement: '' }
    renderForm({ form, isChild: true })

    expect(screen.queryByLabelText(/^tipo$/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/local de exibição/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/^url$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /salvar/i })).toBeDisabled()
  })

  it('com label e URL válidos, o botão fica habilitado', () => {
    const form: NavItemFormState = { type: 'LINK', label: 'Sobre nós', url: 'https://loja.com/about-us', placement: '' }
    renderForm({ form, isChild: true })

    expect(screen.getByRole('button', { name: /salvar/i })).not.toBeDisabled()
  })
})

describe('NavItemForm — propagação de mudanças', () => {
  it('propaga a digitação do label via onFormChange', async () => {
    const onFormChange = vi.fn()
    const user = userEvent.setup()
    renderForm({ onFormChange })

    await user.type(screen.getByLabelText(/label/i), 'X')

    expect(onFormChange).toHaveBeenCalledWith({ label: 'X' })
  })

  it('propaga a escolha do tipo via onFormChange', async () => {
    const onFormChange = vi.fn()
    const user = userEvent.setup()
    renderForm({ onFormChange })

    await user.selectOptions(screen.getByLabelText(/^tipo$/i), 'COLLECTION')

    expect(onFormChange).toHaveBeenCalledWith({ type: 'COLLECTION' })
  })
})
