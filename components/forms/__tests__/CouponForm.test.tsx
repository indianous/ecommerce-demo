import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CouponForm, EMPTY_COUPON_FORM, toCouponInput, type CouponFormState } from '../CouponForm'

const valid: CouponFormState = { ...EMPTY_COUPON_FORM, code: 'NATAL10', type: 'PERCENT', value: 10 }

function renderForm(form: Partial<CouponFormState> = {}, props: { valueLocked?: boolean } = {}) {
  const onFormChange = vi.fn()
  const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
  render(
    <CouponForm form={{ ...valid, ...form }} onFormChange={onFormChange} onSubmit={onSubmit} saving={false} valueLocked={props.valueLocked} />,
  )
  return { onFormChange, onSubmit }
}

const submit = () => screen.getByRole('button', { name: /salvar cupom/i })

describe('CouponForm', () => {
  it('válido → botão habilitado', () => {
    renderForm()
    expect(submit()).toBeEnabled()
  })

  it('o código é normalizado para maiúsculas ao digitar', async () => {
    const user = userEvent.setup()
    const { onFormChange } = renderForm({ code: '' })

    await user.type(screen.getByLabelText(/^código/i), 'n')

    expect(onFormChange).toHaveBeenCalledWith({ code: 'N' })
  })

  it.each(['AB', 'COM ESPAÇO', 'CUPOM!'])('código fora do padrão (%s) → erro e botão desabilitado', (code) => {
    renderForm({ code })

    expect(screen.getByText(/de 3 a 30 letras/i)).toBeInTheDocument()
    expect(submit()).toBeDisabled()
  })

  it('percentual fora de 1–100 → erro', () => {
    renderForm({ type: 'PERCENT', value: 150 })
    expect(screen.getByText(/de 1 a 100/i)).toBeInTheDocument()
    expect(submit()).toBeDisabled()
  })

  it('valor fixo zero → erro', () => {
    renderForm({ type: 'FIXED', value: 0 })
    expect(screen.getByText(/maior que zero/i)).toBeInTheDocument()
  })

  it('o teto só aparece no percentual', () => {
    renderForm({ type: 'PERCENT' })
    expect(screen.getByLabelText(/teto de desconto/i)).toBeInTheDocument()
  })

  it('no valor fixo, o teto não aparece', () => {
    renderForm({ type: 'FIXED', value: 20 })
    expect(screen.queryByLabelText(/teto de desconto/i)).not.toBeInTheDocument()
  })

  it('fim antes do início → erro', () => {
    renderForm({ startsAt: '2026-12-10T00:00', endsAt: '2026-12-01T00:00' })
    expect(screen.getByText(/fim precisa ser depois do início/i)).toBeInTheDocument()
    expect(submit()).toBeDisabled()
  })

  it('limite de uso menor que 1 → erro', () => {
    renderForm({ maxUses: '0' })
    expect(screen.getByText(/inteiro a partir de 1/i)).toBeInTheDocument()
    expect(submit()).toBeDisabled()
  })

  it('cupom já usado (valueLocked): tipo e valor desabilitados, com o motivo', () => {
    renderForm({}, { valueLocked: true })

    expect(screen.getByRole('radio', { name: /percentual/i })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /valor fixo/i })).toBeDisabled()
    expect(screen.getByText(/já foi usado: o tipo e o valor não podem mudar/i)).toBeInTheDocument()
  })
})

describe('toCouponInput', () => {
  it('campos opcionais vazios viram null; limites viram números', () => {
    expect(toCouponInput({ ...valid, maxUses: '100', maxUsesPerCustomer: '', minSubtotal: '50', maxDiscountAmount: '' }))
      .toEqual({
        code: 'NATAL10', type: 'PERCENT', value: 10, maxDiscountAmount: null, minSubtotal: 50,
        startsAt: null, endsAt: null, maxUses: 100, maxUsesPerCustomer: null, active: true,
      })
  })

  it('no valor fixo, o teto não vai', () => {
    expect(toCouponInput({ ...valid, type: 'FIXED', value: 20, maxDiscountAmount: '30' }).maxDiscountAmount).toBeNull()
  })
})
