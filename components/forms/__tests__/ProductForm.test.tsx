import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProductForm, EMPTY_PRODUCT_FORM, type ProductFormState } from '../ProductForm'
import type { Category } from '@/types'

const categories: Category[] = [{ id: 'cat-1', name: 'Eletrônicos', slug: 'eletronicos' }]
const twoCategories: Category[] = [
  { id: 'cat-1', name: 'Eletrônicos', slug: 'eletronicos' },
  { id: 'cat-2', name: 'Casa', slug: 'casa' },
]

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

describe('ProductForm — categorias', () => {
  it('renderiza um checkbox por categoria disponível', () => {
    renderForm({ categories: twoCategories })

    expect(screen.getByRole('checkbox', { name: 'Eletrônicos' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Casa' })).toBeInTheDocument()
  })

  it('marcar uma categoria reflete em categoryIds via onFormChange', async () => {
    const onFormChange = vi.fn()
    const user = userEvent.setup()
    renderForm({ categories: twoCategories, onFormChange })

    await user.click(screen.getByRole('checkbox', { name: 'Eletrônicos' }))

    expect(onFormChange).toHaveBeenCalledWith({ categoryIds: ['cat-1'] })
  })

  it('marcar uma segunda categoria adiciona à lista existente', async () => {
    const onFormChange = vi.fn()
    const user = userEvent.setup()
    const form: ProductFormState = { ...EMPTY_PRODUCT_FORM, categoryIds: ['cat-1'] }
    renderForm({ categories: twoCategories, onFormChange, form })

    await user.click(screen.getByRole('checkbox', { name: 'Casa' }))

    expect(onFormChange).toHaveBeenCalledWith({ categoryIds: ['cat-1', 'cat-2'] })
  })

  it('desmarcar uma categoria remove ela de categoryIds', async () => {
    const onFormChange = vi.fn()
    const user = userEvent.setup()
    const form: ProductFormState = { ...EMPTY_PRODUCT_FORM, categoryIds: ['cat-1', 'cat-2'] }
    renderForm({ categories: twoCategories, onFormChange, form })

    await user.click(screen.getByRole('checkbox', { name: 'Eletrônicos' }))

    expect(onFormChange).toHaveBeenCalledWith({ categoryIds: ['cat-2'] })
  })

  it('com 2+ categorias marcadas, mostra select de categoria principal com as marcadas como opções', () => {
    const form: ProductFormState = { ...EMPTY_PRODUCT_FORM, categoryIds: ['cat-1', 'cat-2'] }
    renderForm({ categories: twoCategories, form })

    const select = screen.getByLabelText(/categoria principal/i)
    expect(select).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Eletrônicos' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Casa' })).toBeInTheDocument()
  })

  it('escolher a categoria principal reordena categoryIds', async () => {
    const onFormChange = vi.fn()
    const user = userEvent.setup()
    const form: ProductFormState = { ...EMPTY_PRODUCT_FORM, categoryIds: ['cat-1', 'cat-2'] }
    renderForm({ categories: twoCategories, onFormChange, form })

    await user.selectOptions(screen.getByLabelText(/categoria principal/i), 'cat-2')

    expect(onFormChange).toHaveBeenCalledWith({ categoryIds: ['cat-2', 'cat-1'] })
  })

  it('com 1 categoria marcada, não mostra select de categoria principal', () => {
    const form: ProductFormState = { ...EMPTY_PRODUCT_FORM, categoryIds: ['cat-1'] }
    renderForm({ categories: twoCategories, form })

    expect(screen.queryByLabelText(/categoria principal/i)).not.toBeInTheDocument()
  })

  it('sem nenhuma categoria marcada, botão Salvar fica desabilitado', () => {
    renderForm({ categories: twoCategories })

    expect(screen.getByRole('button', { name: /salvar/i })).toBeDisabled()
  })

  it('com ao menos uma categoria marcada, botão Salvar fica habilitado', () => {
    const form: ProductFormState = { ...EMPTY_PRODUCT_FORM, categoryIds: ['cat-1'] }
    renderForm({ categories: twoCategories, form })

    expect(screen.getByRole('button', { name: /salvar/i })).not.toBeDisabled()
  })
})

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
