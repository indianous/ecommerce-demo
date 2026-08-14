import type { Metadata } from 'next'
import { ProfileContent } from './ProfileContent'

export const metadata: Metadata = { title: 'Meus dados' }

export default function ProfilePage() {
  return <ProfileContent />
}
