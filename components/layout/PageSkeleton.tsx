import { Container, Skeleton } from 'base-ds'

/** Fallback do Suspense dos layouts: título + linhas, no formato dos loadings dos Content. */
export function PageSkeleton() {
  return (
    <Container role="status" aria-label="Carregando página">
      <Skeleton variant="line" height={32} className="mb-6 w-1/3" />
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} variant="line" height={40} className="mb-2" />
      ))}
    </Container>
  )
}
