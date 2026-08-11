import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProductForm, EMPTY_PRODUCT_FORM, type ProductFormState } from '../ProductForm'
import type { Category } from '@/types'

const categories: Category[] = [{ id: 'cat-1', name: 'Eletrônicos', slug: 'eletronicos' }]

function renderForm(overrides: Partial<React.ComponentProps<typeof ProductForm>> = {}) {
  const props: React.ComponentProps<typeof ProductForm> = {
    form: EMPTY_PRODUCT_FORM,
    onFormChange: vi.fn(),
    categories,
    editingId: null,
    saving: false,
    onSubmit: vi.fn((e) => e.preventDefault()),
    accessToken: 'mock-token',
    ...overrides,
  }
  return { ...render(<ProductForm {...props} />), props }
}

describe('ProductForm — dados fiscais', () => {
  it('renderiza os campos fiscais: NCM, CFOP, unidade comercial, GTIN/EAN e origem', () => {
    renderForm()

    expect(screen.getByLabelText(/ncm/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cfop/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/unidade comercial/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/gtin\/ean/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/origem da mercadoria/i)).toBeInTheDocument()
  })

  it('nenhum campo fiscal é obrigatório', () => {
    renderForm()

    expect(screen.getByLabelText(/ncm/i)).not.toBeRequired()
    expect(screen.getByLabelText(/cfop/i)).not.toBeRequired()
    expect(screen.getByLabelText(/unidade comercial/i)).not.toBeRequired()
    expect(screen.getByLabelText(/gtin\/ean/i)).not.toBeRequired()
  })

  it('propaga a digitação do NCM via onFormChange', async () => {
    const onFormChange = vi.fn()
    const user = userEvent.setup()
    renderForm({ onFormChange })

    await user.type(screen.getByLabelText(/ncm/i), '1')

    expect(onFormChange).toHaveBeenCalledWith({ ncm: '1' })
  })

  it('propaga a escolha da origem via onFormChange', async () => {
    const onFormChange = vi.fn()
    const user = userEvent.setup()
    renderForm({ onFormChange })

    await user.selectOptions(screen.getByLabelText(/origem da mercadoria/i), 'NACIONAL')

    expect(onFormChange).toHaveBeenCalledWith({ origin: 'NACIONAL' })
  })

  it('NCM com formato inválido (não 8 dígitos) mostra erro de validação local', () => {
    const form: ProductFormState = { ...EMPTY_PRODUCT_FORM, ncm: '123' }
    renderForm({ form })

    expect(screen.getByRole('alert')).toHaveTextContent(/8 dígitos/i)
  })

  it('NCM com 8 dígitos não mostra erro de validação', () => {
    const form: ProductFormState = { ...EMPTY_PRODUCT_FORM, ncm: '12345678' }
    renderForm({ form })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('NCM vazio (não preenchido) não mostra erro de validação', () => {
    renderForm()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('ProductForm — promoção', () => {
  it('renderiza os campos de preço promocional e datas de início/fim', () => {
    renderForm()

    expect(screen.getByLabelText(/preço promocional/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/início da promoção/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/fim da promoção/i)).toBeInTheDocument()
  })

  it('preencher só a data de início mostra erro de validação local', () => {
    const form: ProductFormState = { ...EMPTY_PRODUCT_FORM, promotionStartDate: '2026-01-01T00:00' }
    renderForm({ form })

    expect(screen.getByRole('alert')).toHaveTextContent(/obrigatórios juntos/i)
  })

  it('preencher só a data de fim mostra erro de validação local', () => {
    const form: ProductFormState = { ...EMPTY_PRODUCT_FORM, promotionEndDate: '2026-01-02T00:00' }
    renderForm({ form })

    expect(screen.getByRole('alert')).toHaveTextContent(/obrigatórios juntos/i)
  })

  it('preencher as duas datas não mostra erro de datas', () => {
    const form: ProductFormState = {
      ...EMPTY_PRODUCT_FORM,
      promotionStartDate: '2026-01-01T00:00',
      promotionEndDate: '2026-01-02T00:00',
    }
    renderForm({ form })

    expect(screen.queryByText(/obrigatórios juntos/i)).not.toBeInTheDocument()
  })

  it('preço promocional maior ou igual ao preço normal mostra erro local', () => {
    const form: ProductFormState = { ...EMPTY_PRODUCT_FORM, price: 100, promotionalPrice: 100 }
    renderForm({ form })

    expect(screen.getByRole('alert')).toHaveTextContent(/menor que o preço normal/i)
  })

  it('preço promocional menor que o preço normal não mostra erro', () => {
    const form: ProductFormState = { ...EMPTY_PRODUCT_FORM, price: 100, promotionalPrice: 80 }
    renderForm({ form })

    expect(screen.queryByText(/menor que o preço normal/i)).not.toBeInTheDocument()
  })

  it('propaga a digitação da data de início via onFormChange', () => {
    const onFormChange = vi.fn()
    renderForm({ onFormChange })

    fireEvent.change(screen.getByLabelText(/início da promoção/i), {
      target: { value: '2026-01-01T10:00' },
    })

    expect(onFormChange).toHaveBeenCalledWith({ promotionStartDate: '2026-01-01T10:00' })
  })
})
