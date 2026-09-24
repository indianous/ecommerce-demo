import { Heading, Text } from 'base-ds'

interface ManagementPageHeaderProps {
  title: string
  description?: string
  /** Ação principal da tela (ex.: botão "Novo"), à direita do título. */
  action?: React.ReactNode
}

export function ManagementPageHeader({ title, description, action }: ManagementPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <Heading as="h1" size="2xl">{title}</Heading>
        {description && <Text size="sm" color="muted">{description}</Text>}
      </div>
      {action}
    </div>
  )
}
