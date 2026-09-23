import type { Metadata } from 'next'
import { CustomerProfileContent } from '@/components/content/store/CustomerProfileContent'

export const metadata: Metadata = { title: 'Meus dados' }

export default function ProfilePage() {
  return <CustomerProfileContent />
}
