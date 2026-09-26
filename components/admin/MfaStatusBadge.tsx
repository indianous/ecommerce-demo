import { Badge } from 'base-ds'
import type { UserRole } from '@/types'

/** Estado do 2FA no painel. Para a equipe, sem 2FA = pendente: ela configura no próximo login. */
export function MfaStatusBadge({ mfaEnabled, role }: { mfaEnabled: boolean; role: UserRole }) {
  if (mfaEnabled) return <Badge variant="success">2FA ativo</Badge>
  if (role === 'CUSTOMER') return <Badge variant="default">2FA desativado</Badge>
  return <Badge variant="warning">2FA pendente</Badge>
}
