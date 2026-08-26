import { useState } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
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
    ...overrides,
  }
  return { ...render(<ProductForm {...props} />), props }
}

function ControlledProductForm() {
  const [form, setForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM)
  return (
    <ProductForm
      form={form}
      onFormChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
      categories={categories}
      editingId={null}
      saving={false}
      onSubmit={(e) => e.preventDefault()}
    />
  )
}

describe('ProductForm — categorias', () => {
  it('renderiza um combobox de categorias com as opções disponíveis', async () => {
    const user = userEvent.setup()
    renderForm({ categories: twoCategories })

    await user.click(screen.getByRole('combobox', { name: /categorias/i }))
    const listbox = screen.getByRole('listbox')

    expect(within(listbox).getByRole('option', { name: 'Eletrônicos' })).toBeInTheDocument()
    expect(within(listbox).getByRole('option', { name: 'Casa' })).toBeInTheDocument()
  })

  it('selecionar uma categoria reflete em categoryIds via onFormChange', async () => {
    const onFormChange = vi.fn()
    const user = userEvent.setup()
    renderForm({ categories: twoCategories, onFormChange })

    await user.click(screen.getByRole('combobox', { name: /categorias/i }))
    await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Eletrônicos' }))

    expect(onFormChange).toHaveBeenCalledWith({ categoryIds: ['cat-1'] })
  })

  it('selecionar uma segunda categoria adiciona à lista existente', async () => {
    const onFormChange = vi.fn()
    const user = userEvent.setup()
    const form: ProductFormState = { ...EMPTY_PRODUCT_FORM, categoryIds: ['cat-1'] }
    renderForm({ categories: twoCategories, onFormChange, form })

    await user.click(screen.getByRole('combobox', { name: /categorias/i }))
    await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Casa' }))

    expect(onFormChange).toHaveBeenCalledWith({ categoryIds: ['cat-1', 'cat-2'] })
  })

  it('desmarcar uma categoria remove ela de categoryIds', async () => {
    const onFormChange = vi.fn()
    const user = userEvent.setup()
    const form: ProductFormState = { ...EMPTY_PRODUCT_FORM, categoryIds: ['cat-1', 'cat-2'] }
    renderForm({ categories: twoCategories, onFormChange, form })

    await user.click(screen.getByRole('combobox', { name: /categorias/i }))
    await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Eletrônicos' }))

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

describe('ProductForm — envio', () => {
  it('renderiza os campos de envio: peso, altura, largura, comprimento e frete grátis', () => {
    renderForm()

    expect(screen.getByLabelText(/peso \(kg\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/altura \(cm\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/largura \(cm\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/comprimento \(cm\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/frete grátis/i)).toBeInTheDocument()
  })

  it('propaga a digitação do peso via onFormChange', async () => {
    const onFormChange = vi.fn()
    const user = userEvent.setup()
    renderForm({ onFormChange })

    await user.clear(screen.getByLabelText(/peso \(kg\)/i))
    await user.type(screen.getByLabelText(/peso \(kg\)/i), '2')

    expect(onFormChange).toHaveBeenCalledWith({ weight: 2 })
  })

  it('marcar o checkbox "Frete grátis" propaga freeShipping=true via onFormChange', async () => {
    const onFormChange = vi.fn()
    const user = userEvent.setup()
    renderForm({ onFormChange })

    await user.click(screen.getByLabelText(/frete grátis/i))

    expect(onFormChange).toHaveBeenCalledWith({ freeShipping: true })
  })

  it('checkbox "Frete grátis" reflete form.freeShipping', () => {
    const form: ProductFormState = { ...EMPTY_PRODUCT_FORM, freeShipping: true }
    renderForm({ form })

    expect(screen.getByLabelText(/frete grátis/i)).toBeChecked()
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

describe('ProductForm — imagens', () => {
  let uploadCallCount = 0
  const server = setupServer(
    http.post('/api/upload/image', () => {
      uploadCallCount += 1
      return HttpResponse.json({ url: `https://cdn.example.com/${uploadCallCount}.jpg` })
    }),
  )

  beforeAll(() => server.listen())
  afterEach(() => {
    server.resetHandlers()
    uploadCallCount = 0
  })
  afterAll(() => server.close())

  it('o input de upload de imagem aceita múltiplos arquivos', () => {
    renderForm()

    expect(screen.getByLabelText(/file upload/i)).toHaveAttribute('multiple')
  })

  it('selecionar 2 arquivos de uma vez faz upload dos 2 e resulta em imageUrls com as 2 URLs', async () => {
    const user = userEvent.setup()
    render(<ControlledProductForm />)

    await user.upload(screen.getByLabelText(/file upload/i), [
      new File(['a'], 'a.png', { type: 'image/png' }),
      new File(['b'], 'b.png', { type: 'image/png' }),
    ])

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(2))
    expect(screen.getByAltText('Imagem 1 do produto')).toHaveAttribute('src', 'https://cdn.example.com/1.jpg')
    expect(screen.getByAltText('Imagem 2 do produto')).toHaveAttribute('src', 'https://cdn.example.com/2.jpg')
  })

  it('selecionar um 3º arquivo depois de já ter 2 acumula, sem sobrescrever', async () => {
    const user = userEvent.setup()
    render(<ControlledProductForm />)
    const input = screen.getByLabelText(/file upload/i)

    await user.upload(input, [
      new File(['a'], 'a.png', { type: 'image/png' }),
      new File(['b'], 'b.png', { type: 'image/png' }),
    ])
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(2))

    await user.upload(input, [new File(['c'], 'c.png', { type: 'image/png' })])

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(3))
    expect(screen.getByAltText('Imagem 3 do produto')).toHaveAttribute('src', 'https://cdn.example.com/3.jpg')
  })

  it('mostra miniatura com botão Remover para cada imagem em imageUrls', () => {
    const form: ProductFormState = { ...EMPTY_PRODUCT_FORM, imageUrls: ['url1', 'url2'] }
    renderForm({ form })

    expect(screen.getAllByRole('button', { name: /remover/i })).toHaveLength(2)
  })

  it('clicar Remover numa miniatura tira aquela URL, mantendo ordem das demais', async () => {
    const onFormChange = vi.fn()
    const user = userEvent.setup()
    const form: ProductFormState = { ...EMPTY_PRODUCT_FORM, imageUrls: ['url1', 'url2', 'url3'] }
    renderForm({ form, onFormChange })

    await user.click(screen.getAllByRole('button', { name: /remover/i })[1])

    expect(onFormChange).toHaveBeenCalledWith({ imageUrls: ['url1', 'url3'] })
  })

  it('com 2+ imagens, miniaturas que não são a primeira têm botão "Tornar capa"; clicar reordena', async () => {
    const onFormChange = vi.fn()
    const user = userEvent.setup()
    const form: ProductFormState = { ...EMPTY_PRODUCT_FORM, imageUrls: ['url1', 'url2', 'url3'] }
    renderForm({ form, onFormChange })

    expect(screen.getAllByRole('button', { name: /tornar capa/i })).toHaveLength(2)

    await user.click(screen.getAllByRole('button', { name: /tornar capa/i })[0])

    expect(onFormChange).toHaveBeenCalledWith({ imageUrls: ['url2', 'url1', 'url3'] })
  })

  it('miniatura na posição 0 mostra indicação de "Capa"', () => {
    const form: ProductFormState = { ...EMPTY_PRODUCT_FORM, imageUrls: ['url1', 'url2'] }
    renderForm({ form })

    expect(screen.getByText('Capa')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /tornar capa/i })).toHaveLength(1)
  })

  it('selecionar mais de 8 arquivos de uma vez faz upload de só 8 e mostra aviso de limite', async () => {
    const user = userEvent.setup()
    render(<ControlledProductForm />)

    const files = Array.from({ length: 9 }, (_, i) => new File([`f${i}`], `f${i}.png`, { type: 'image/png' }))
    await user.upload(screen.getByLabelText(/file upload/i), files)

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(8))
    expect(uploadCallCount).toBe(8)
    expect(screen.getByText(/limite de 8 imagens atingido/i)).toBeInTheDocument()
  })
})
