import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PixKeyForm } from '../PixKeyForm'

function renderForm(props: Partial<React.ComponentProps<typeof PixKeyForm>> = {}) {
  const onPixKeyChange = vi.fn()
  const onHolderNameChange = vi.fn()
  const onSave = vi.fn()
  render(
    <PixKeyForm
      pixKey=""
      holderName=""
      onPixKeyChange={onPixKeyChange}
      onHolderNameChange={onHolderNameChange}
      onSave={onSave}
      saving={false}
      saveLabel="Salvar chave PIX"
      {...props}
    />,
  )
  return { onPixKeyChange, onHolderNameChange, onSave }
}

describe('PixKeyForm', () => {
  it('chave vazia: botão salvar desabilitado e sem mensagem de erro', () => {
    renderForm()

    expect(screen.getByRole('button', { name: /salvar chave pix/i })).toBeDisabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it.each([
    ['529.982.247-25', 'CPF'],
    ['11.444.777/0001-61', 'CNPJ'],
    ['loja@exemplo.com', 'E-mail'],
    ['+55 (11) 99999-9999', 'Telefone'],
    ['123e4567-e89b-42d3-a456-426614174000', 'Chave aleatória'],
  ])('chave %s válida: mostra o tipo detectado (%s) e habilita salvar', (pixKey, label) => {
    renderForm({ pixKey })

    expect(screen.getByText(new RegExp(`tipo.*${label}`, 'i'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /salvar chave pix/i })).toBeEnabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it.each(['529.982.247-26', '(11) 99999-9999', 'abc'])('chave %s inválida: mostra o erro e desabilita salvar', (pixKey) => {
    renderForm({ pixKey })

    expect(screen.getByRole('alert')).toHaveTextContent(/chave pix inválida/i)
    expect(screen.getByRole('button', { name: /salvar chave pix/i })).toBeDisabled()
  })

  it('digitar avisa o pai; o favorecido é opcional', async () => {
    const { onPixKeyChange, onHolderNameChange } = renderForm({ pixKey: '52998224725' })

    await userEvent.type(screen.getByLabelText(/chave pix/i), '1')
    await userEvent.type(screen.getByLabelText(/favorecido/i), 'L')

    expect(onPixKeyChange).toHaveBeenCalled()
    expect(onHolderNameChange).toHaveBeenCalledWith('L')
    expect(screen.getByRole('button', { name: /salvar chave pix/i })).toBeEnabled()
  })

  it('enviar o formulário chama onSave', async () => {
    const { onSave } = renderForm({ pixKey: '52998224725' })

    await userEvent.click(screen.getByRole('button', { name: /salvar chave pix/i }))

    expect(onSave).toHaveBeenCalledOnce()
  })
})
