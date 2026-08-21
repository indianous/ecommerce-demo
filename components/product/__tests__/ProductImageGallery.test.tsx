import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ProductImageGallery } from '../ProductImageGallery'

const imageUrls = ['https://example.com/a.jpg', 'https://example.com/b.jpg']

describe('ProductImageGallery', () => {
  it('renderiza uma thumbnail clicável por imagem', () => {
    render(<ProductImageGallery imageUrls={imageUrls} productName="Camiseta" />)

    expect(screen.getByRole('button', { name: /view image 1: camiseta — imagem 1/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /view image 2: camiseta — imagem 2/i })).toBeInTheDocument()
  })

  it('clicar numa thumbnail troca a imagem principal em destaque', async () => {
    const user = userEvent.setup()
    render(<ProductImageGallery imageUrls={imageUrls} productName="Camiseta" />)

    await user.click(screen.getByRole('button', { name: /view image 2: camiseta — imagem 2/i }))

    expect(screen.getByRole('button', { name: /zoom image: camiseta — imagem 2/i })).toBeInTheDocument()
  })

  it('sem imagens, mantém o placeholder com role=img e aria-label do nome do produto', () => {
    render(<ProductImageGallery imageUrls={[]} productName="Camiseta" />)

    expect(screen.getByRole('img', { name: 'Camiseta' })).toBeInTheDocument()
  })
})
