import type { Metadata } from 'next'
import ReactMarkdown from 'react-markdown'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'

export const metadata: Metadata = {
  title: 'Sobre nós',
  description: 'Conheça nossa história e missão.',
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

export default async function AboutUsPage() {
  const settings = await fetchSettings()
  const content: string | null = settings?.aboutUsContent ?? null

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold">Sobre nós</h1>
      {content ? (
        <div className="prose prose-neutral max-w-none dark:prose-invert">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-muted-foreground">Conteúdo em breve.</p>
      )}
    </main>
  )
}
