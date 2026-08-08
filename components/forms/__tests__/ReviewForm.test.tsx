import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReviewForm } from '../ReviewForm'

type Overrides = Partial<{
  rating: number
  onRatingChange: (value: number) => void
  comment: string
  onCommentChange: (value: string) => void
  images: File[]
  onImagesChange: (files: File[]) => void
  onSubmit: () => void
  onCancel: () => void
  submitting: boolean
  submitLabel: string
  error: string | null
}>

function renderForm(overrides: Overrides = {}) {
  const props = {
    rating: 0,
    onRatingChange: vi.fn(),
    comment: '',
    onCommentChange: vi.fn(),
    images: [],
    onImagesChange: vi.fn(),
    onSubmit: vi.fn(),
    submitting: false,
    ...overrides,
  }
  render(<ReviewForm {...props} />)
  return props
}

describe('ReviewForm', () => {
  it('botão "Enviar avaliação" desabilitado sem selecionar estrelas', () => {
    renderForm({ rating: 0 })
    expect(screen.getByRole('button', { name: /enviar avaliação/i })).toBeDisabled()
  })

  it('botão "Enviar avaliação" habilitado ao selecionar uma nota', () => {
    renderForm({ rating: 5 })
    expect(screen.getByRole('button', { name: /enviar avaliação/i })).toBeEnabled()
  })

  it('chama onRatingChange ao clicar em uma estrela', async () => {
    const onRatingChange = vi.fn()
    renderForm({ onRatingChange })
    await userEvent.click(screen.getByRole('radio', { name: /4 star/i }))
    expect(onRatingChange).toHaveBeenCalledWith(4)
  })

  it('chama onCommentChange ao digitar no comentário', async () => {
    const onCommentChange = vi.fn()
    renderForm({ onCommentChange })
    await userEvent.type(screen.getByLabelText(/comentário/i), 'x')
    expect(onCommentChange).toHaveBeenCalledWith('x')
  })

  it('FileUpload aceita múltiplos arquivos de imagem', () => {
    renderForm()
    const input = screen.getByLabelText(/file upload/i) as HTMLInputElement
    expect(input).toHaveAttribute('multiple')
    expect(input).toHaveAttribute('accept', expect.stringContaining('image/'))
  })

  it('chama onSubmit ao clicar em "Enviar avaliação" com nota preenchida', async () => {
    const onSubmit = vi.fn()
    renderForm({ rating: 5, onSubmit })
    await userEvent.click(screen.getByRole('button', { name: /enviar avaliação/i }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('exibe a mensagem de erro passada via prop', () => {
    renderForm({ error: 'Você precisa comprar o produto para avaliá-lo' })
    expect(screen.getByText(/você precisa comprar o produto/i)).toBeInTheDocument()
  })

  it('desabilita o botão de envio quando submitting=true', () => {
    renderForm({ rating: 5, submitting: true })
    expect(screen.getByRole('button', { name: /enviar avaliação/i })).toBeDisabled()
  })
})
