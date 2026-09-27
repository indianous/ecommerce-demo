import type { Metadata } from 'next'
import ReactMarkdown from 'react-markdown'
import { Container } from '@indianous/base-ds'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export const metadata: Metadata = {
  title: 'Termos e condições',
  description: 'Leia nossos termos e condições de uso.',
}

async function fetchSettings() {
  try {
    const res = await fetch(`${API}/site/settings`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function TermsAndConditionsPage() {
  const settings = await fetchSettings()
  const content: string | null = settings?.termsContent ?? null

  return (
    <Container width="3xl" spacing="relaxed">
      <h1 className="mb-6 text-3xl font-bold">Termos e condições</h1>
      {content ? (
        <div className="prose prose-neutral max-w-none dark:prose-invert">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-muted-foreground">Conteúdo em breve.</p>
      )}
    </Container>
  )
}
