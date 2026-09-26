import { Badge } from 'base-ds'

/** Estado da conta nos detalhes do painel: senha ainda não escolhida e e-mail não confirmado. */
export function AccountStatusBadges({ passwordSet, emailVerified }: { passwordSet: boolean; emailVerified: boolean }) {
  if (passwordSet && emailVerified) return null
  return (
    <span className="inline-flex flex-wrap gap-2">
      {!passwordSet && <Badge variant="warning">Senha não definida</Badge>}
      {!emailVerified && <Badge variant="warning">E-mail não confirmado</Badge>}
    </span>
  )
}
