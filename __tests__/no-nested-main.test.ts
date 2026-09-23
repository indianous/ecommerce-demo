import { readdirSync, readFileSync, statSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

// O <main> é do shell (AppShell, AdminShell, EmployeeShell) ou do layout de (auth).
// Páginas e contents usam o Container do base-ds, que renderiza <div> (plano #55).
const root = path.resolve(__dirname, '..')
const dirs = [
  'components/content',
  'app/(public)',
  'app/(customer)',
  'app/(employee)',
  'app/(admin)',
  'app/(auth)',
]
const allowed = new Set(['app/(auth)/layout.tsx'])

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return name === '__tests__' ? [] : tsxFiles(full)
    return full.endsWith('.tsx') ? [full] : []
  })
}

describe('landmark <main>', () => {
  it('páginas e contents não renderizam <main> (evita <main> aninhado no do shell)', () => {
    const offenders = dirs
      .flatMap((dir) => tsxFiles(path.join(root, dir)))
      .map((file) => path.relative(root, file))
      .filter((file) => !allowed.has(file))
      .filter((file) => /<main[\s>]/.test(readFileSync(path.join(root, file), 'utf8')))

    expect(offenders).toEqual([])
  })
})
