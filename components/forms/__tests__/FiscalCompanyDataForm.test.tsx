import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  FiscalCompanyDataForm,
  EMPTY_FISCAL_COMPANY_DATA,
  isValidCnpj,
} from '../FiscalCompanyDataForm'
import type { FiscalCompanyData } from '@/types'

const VALID_CNPJ = '11444777000161'

function renderForm(overrides: Partial<React.ComponentProps<typeof FiscalCompanyDataForm>> = {}) {
  const props: React.ComponentProps<typeof FiscalCompanyDataForm> = {
    data: EMPTY_FISCAL_COMPANY_DATA,
    onChange: vi.fn(),
    onSave: vi.fn(),
    saving: false,
    ...overrides,
  }
  return { ...render(<FiscalCompanyDataForm {...props} />), props }
}

describe('isValidCnpj', () => {
  it('valida um CNPJ com dígitos verificadores corretos', () => {
    expect(isValidCnpj(VALID_CNPJ)).toBe(true)
  })

  it('rejeita um CNPJ com dígito verificador inválido', () => {
    expect(isValidCnpj('11444777000162')).toBe(false)
  })

  it('rejeita um CNPJ com todos os dígitos iguais', () => {
    expect(isValidCnpj('11111111111111')).toBe(false)
  })
})

describe('FiscalCompanyDataForm', () => {
  it('renderiza os campos de CNPJ, razão social, IE, regime tributário e endereço', () => {
    renderForm()

    expect(screen.getByLabelText(/cnpj/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/razão social/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/inscrição estadual/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/regime tributário/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/rua\/logradouro/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/número/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/bairro/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cidade/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^estado$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cep/i)).toBeInTheDocument()
  })

  it('CNPJ com dígito verificador inválido bloqueia o submit', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    const data: FiscalCompanyData = {
      ...EMPTY_FISCAL_COMPANY_DATA,
      cnpj: '11444777000162',
      legalName: 'Empresa Teste',
      street: 'Rua A',
      number: '1',
      neighborhood: 'Centro',
      city: 'SP',
      state: 'SP',
      zipCode: '01000000',
    }
    renderForm({ data, onSave })

    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/cnpj inválido/i)
  })

  it('CNPJ válido permite o submit', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    const data: FiscalCompanyData = {
      ...EMPTY_FISCAL_COMPANY_DATA,
      cnpj: VALID_CNPJ,
      legalName: 'Empresa Teste',
      street: 'Rua A',
      number: '1',
      neighborhood: 'Centro',
      city: 'SP',
      state: 'SP',
      zipCode: '01000000',
    }
    renderForm({ data, onSave })

    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('propaga a digitação da razão social via onChange', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    renderForm({ onChange })

    await user.type(screen.getByLabelText(/razão social/i), 'X')

    expect(onChange).toHaveBeenCalledWith({ legalName: 'X' })
  })
})
