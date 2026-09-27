import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '@indianous/base-ds'
import { describe, expect, it, vi } from 'vitest'
import { RecoveryCodesPanel } from '../RecoveryCodesPanel'

const downloadBlob = vi.fn()
vi.mock('@/lib/downloadBlob', () => ({ downloadBlob: (...args: unknown[]) => downloadBlob(...args) }))

const codes = Array.from({ length: 10 }, (_, i) => `AAA${i}-BBB${i}`)

function renderPanel() {
  const onContinue = vi.fn()
  render(
    <ToastProvider>
      <RecoveryCodesPanel codes={codes} onContinue={onContinue} />
    </ToastProvider>,
  )
  return { onContinue }
}

describe('RecoveryCodesPanel', () => {
  it('lista os 10 códigos e avisa que não serão mostrados de novo', () => {
    renderPanel()

    codes.forEach((code) => expect(screen.getByText(code)).toBeInTheDocument())
    expect(screen.getByText(/estes códigos não serão mostrados de novo/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copiar códigos de recuperação/i })).toBeInTheDocument()
  })

  it('"Baixar .txt" baixa um arquivo com um código por linha', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: /baixar .txt/i }))

    const [blob, filename] = downloadBlob.mock.calls[0] as [Blob, string]
    expect(filename).toBe('codigos-de-recuperacao.txt')
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsText(blob)
    })
    expect(text).toContain(codes.join('\n'))
  })

  it('"Continuar" só habilita depois de marcar "Guardei os códigos em um lugar seguro"', async () => {
    const user = userEvent.setup()
    const { onContinue } = renderPanel()
    const continuar = screen.getByRole('button', { name: /continuar/i })

    expect(continuar).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: /guardei os códigos em um lugar seguro/i }))
    expect(continuar).toBeEnabled()
    await user.click(continuar)

    expect(onContinue).toHaveBeenCalled()
  })
})
