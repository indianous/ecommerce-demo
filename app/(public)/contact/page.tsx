import type { Metadata } from 'next'
import ReactMarkdown from 'react-markdown'
import { Container } from '@indianous/base-ds'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export const metadata: Metadata = {
  title: 'Contato',
  description: 'Entre em contato conosco.',
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

export default async function ContactPage() {
  const settings = await fetchSettings()
  const description: string | null = settings?.contactDescription ?? null
  const phone: string | null = settings?.contactPhone ?? null
  const email: string | null = settings?.contactEmail ?? null

  const hasContent = description || phone || email

  return (
    <Container width="3xl" spacing="relaxed">
      <h1 className="mb-6 text-3xl font-bold">Contato</h1>
      {hasContent ? (
        <div className="flex flex-col gap-6">
          {description && (
            <div className="prose prose-neutral max-w-none dark:prose-invert">
              <ReactMarkdown>{description}</ReactMarkdown>
            </div>
          )}
          {phone && (
            <p>
              <span className="font-medium">Telefone: </span>
              <a href={`tel:${phone}`} className="text-primary hover:underline">
                {phone}
              </a>
            </p>
          )}
          {email && (
            <p>
              <span className="font-medium">E-mail: </span>
              <a href={`mailto:${email}`} className="text-primary hover:underline">
                {email}
              </a>
            </p>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground">Informações de contato em breve.</p>
      )}
    </Container>
  )
}
