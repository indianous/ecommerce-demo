import type { Metadata } from 'next'
import { NavigationContent } from './NavigationContent'

export const metadata: Metadata = { title: 'Navegação do site' }

export default function NavigationPage() {
  return <NavigationContent />
}
