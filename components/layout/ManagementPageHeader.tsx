import { Heading, Text } from 'base-ds'

interface ManagementPageHeaderProps {
  title: string
  description?: string
}

export function ManagementPageHeader({ title, description }: ManagementPageHeaderProps) {
  return (
    <div className="mb-6">
      <Heading as="h1" size="2xl">{title}</Heading>
      {description && <Text size="sm" color="muted">{description}</Text>}
    </div>
  )
}
