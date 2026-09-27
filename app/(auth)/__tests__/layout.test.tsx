import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AuthLayout from '../layout'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/login',
}))

// Página que nunca termina de carregar: simula o bailout do useSearchParams no prerender
function Suspends(): never {
  throw new Promise(() => {})
}

describe('AuthLayout', () => {
  it('renderiza o children recebido', () => {
    render(
      <AuthLayout>
        <p>conteúdo de login</p>
      </AuthLayout>,
    )
    expect(screen.getByText('conteúdo de login')).toBeInTheDocument()
  })

  it('header mínimo: só o logo (ou "Loja"), centralizado, levando à home (plano 66, etapa 9)', () => {
    render(
      <AuthLayout>
        <p>conteúdo de login</p>
      </AuthLayout>,
    )
    const header = screen.getByRole('banner')
    const logo = within(header).getByRole('link', { name: 'Loja' })
    expect(logo).toHaveAttribute('href', '/')
    expect(within(header).getAllByRole('link')).toHaveLength(1)
    expect(logo.parentElement).toHaveClass('justify-center')
    expect(within(header).queryByRole('link', { name: /voltar à loja/i })).not.toBeInTheDocument()
  })

  it('sem nada da navbar da loja: busca, carrinho, sino e menu do usuário', () => {
    render(
      <AuthLayout>
        <p>conteúdo de login</p>
      </AuthLayout>,
    )
    expect(screen.queryByRole('search')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /carrinho|notificações|menu do usuário/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^entrar$/i })).not.toBeInTheDocument()
  })

  it('não exibe sidebar ou drawer de back-office', () => {
    render(
      <AuthLayout>
        <p>conteúdo de login</p>
      </AuthLayout>,
    )
    expect(screen.queryByRole('navigation', { name: /sidebar navigation/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /abrir menu/i })).not.toBeInTheDocument()
  })

  it('footer mínimo: copyright e links de privacidade e termos, sem redes sociais', () => {
    render(
      <AuthLayout>
        <p>conteúdo de login</p>
      </AuthLayout>,
    )
    const footer = screen.getByRole('contentinfo')
    expect(footer).toHaveTextContent(`© ${new Date().getFullYear()} Loja`)
    expect(within(footer).getByRole('link', { name: /privacidade/i })).toHaveAttribute('href', '/privacy-policy')
    expect(within(footer).getByRole('link', { name: /termos/i })).toHaveAttribute('href', '/terms-and-conditions')
    expect(within(footer).getAllByRole('link')).toHaveLength(2)
  })

  it('header e footer ficam fora do <main>', () => {
    render(
      <AuthLayout>
        <p>conteúdo de login</p>
      </AuthLayout>,
    )
    expect(screen.getByRole('main')).not.toContainElement(screen.getByRole('banner'))
    expect(screen.getByRole('main')).not.toContainElement(screen.getByRole('contentinfo'))
  })

  it('enquanto a página suspende, mostra o esqueleto de carregamento', () => {
    render(
      <AuthLayout>
        <Suspends />
      </AuthLayout>,
    )
    expect(screen.getByRole('status', { name: /carregando/i })).toBeInTheDocument()
  })

  it('renderiza um único <main> envolvendo o conteúdo', () => {
    render(
      <AuthLayout>
        <p>conteúdo de login</p>
      </AuthLayout>,
    )
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('main')).toContainElement(screen.getByText('conteúdo de login'))
  })
})
