import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PromotionForm, type PromotionFormState } from '../PromotionForm'

const valid: PromotionFormState = {
  name: 'Black Friday',
  type: 'PERCENT',
  value: 20,
  startDate: '2026-10-01T00:00',
  endDate: '2026-10-08T23:59',
}

function renderForm(form: Partial<PromotionFormState> = {}, props: { basePrice?: number; submitLabel?: string } = {}) {
  const onFormChange = vi.fn()
  const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
  render(
    <PromotionForm
      form={{ ...valid, ...form }}
      onFormChange={onFormChange}
      onSubmit={onSubmit}
      saving={false}
      basePrice={props.basePrice}
      submitLabel={props.submitLabel}
    />,
  )
  return { onFormChange, onSubmit }
}

const submitButton = () => screen.getByRole('button', { name: /salvar promoção/i })

describe('PromotionForm', () => {
  it('com tudo válido, o botão fica habilitado e envia o form', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    expect(submitButton()).toBeEnabled()
    await user.click(submitButton())
    expect(onSubmit).toHaveBeenCalled()
  })

  it('alterna entre percentual e preço fixo', async () => {
    const user = userEvent.setup()
    const { onFormChange } = renderForm()

    expect(screen.getByRole('radio', { name: /percentual/i })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: /preço fixo/i }))

    expect(onFormChange).toHaveBeenCalledWith({ type: 'FIXED_PRICE' })
  })

  it.each([0, 100, 150])('percentual %s fica fora de 1–99 → erro e botão desabilitado', (value) => {
    renderForm({ type: 'PERCENT', value })

    expect(screen.getByText(/entre 1 e 99/i)).toBeInTheDocument()
    expect(submitButton()).toBeDisabled()
  })

  it('preço fixo zero → erro e botão desabilitado', () => {
    renderForm({ type: 'FIXED_PRICE', value: 0 })

    expect(screen.getByText(/maior que zero/i)).toBeInTheDocument()
    expect(submitButton()).toBeDisabled()
  })

  it('preço fixo maior ou igual ao preço normal (um produto) → erro', () => {
    renderForm({ type: 'FIXED_PRICE', value: 60 }, { basePrice: 50 })

    expect(screen.getByText(/menor que o preço normal/i)).toBeInTheDocument()
    expect(submitButton()).toBeDisabled()
  })

  it('sem início ou sem fim → botão desabilitado', () => {
    renderForm({ startDate: '', endDate: '' })

    expect(submitButton()).toBeDisabled()
  })

  it('fim antes do início → erro e botão desabilitado', () => {
    renderForm({ startDate: '2026-10-08T00:00', endDate: '2026-10-01T00:00' })

    expect(screen.getByText(/fim precisa ser depois do início/i)).toBeInTheDocument()
    expect(submitButton()).toBeDisabled()
  })

  it('com um produto de R$ 100 e 20%, mostra a prévia de R$ 80,00', () => {
    renderForm({ type: 'PERCENT', value: 20 }, { basePrice: 100 })

    expect(screen.getByText(/R\$\s*80,00/)).toBeInTheDocument()
  })

  it('sem preço base (vários produtos), não mostra prévia', () => {
    renderForm({ type: 'PERCENT', value: 20 })

    expect(screen.queryByText(/preço promocional:/i)).not.toBeInTheDocument()
  })

  it('sem nome → botão desabilitado', () => {
    renderForm({ name: '  ' })

    expect(submitButton()).toBeDisabled()
  })

  it('editar o nome chama onFormChange', async () => {
    const user = userEvent.setup()
    const { onFormChange } = renderForm({ name: '' })

    await user.type(screen.getByLabelText(/^nome/i), 'N')

    expect(onFormChange).toHaveBeenCalledWith({ name: 'N' })
  })

  it('o rótulo do botão vem por prop', () => {
    renderForm({}, { submitLabel: 'Criar promoção' })

    expect(screen.getByRole('button', { name: 'Criar promoção' })).toBeEnabled()
  })
})
