import type { Metadata } from 'next'
import { AuditLogsContent } from './AuditLogsContent'

export const metadata: Metadata = { title: 'Auditoria' }

export default function AuditLogsPage() {
  return <AuditLogsContent />
}
