import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, ToastViewport } from 'base-ds'
import { CopyButton } from '../CopyButton'

function renderCopyButton(value = 'joao@test.com', label = 'e-mail') {
  return render(
    <ToastProvider>
      <CopyButton value={value} label={label} />
      <ToastViewport />
    </ToastProvider>,
  )
}

describe('CopyButton', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('aria-label reflete o label recebido', () => {
    renderCopyButton('joao@test.com', 'e-mail')
    expect(screen.getByRole('button', { name: 'Copiar e-mail' })).toBeInTheDocument()
  })

  it('clicar chama navigator.clipboard.writeText com o value e mostra toast de sucesso', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    renderCopyButton('joao@test.com', 'e-mail')

    await user.click(screen.getByRole('button', { name: 'Copiar e-mail' }))

    expect(writeText).toHaveBeenCalledWith('joao@test.com')
    expect(await screen.findByText('Copiado!')).toBeInTheDocument()
  })

  it('com navigator.clipboard indisponível, usa o fallback em vez de quebrar', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    const execCommand = vi.fn().mockReturnValue(true)
    document.execCommand = execCommand
    renderCopyButton('joao@test.com', 'e-mail')

    await user.click(screen.getByRole('button', { name: 'Copiar e-mail' }))

    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(await screen.findByText('Copiado!')).toBeInTheDocument()
  })

  it('quando nem clipboard nem fallback funcionam, mostra toast de erro', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    document.execCommand = vi.fn().mockReturnValue(false)
    renderCopyButton('joao@test.com', 'e-mail')

    await user.click(screen.getByRole('button', { name: 'Copiar e-mail' }))

    expect(await screen.findByText(/não foi possível copiar/i)).toBeInTheDocument()
  })
})
