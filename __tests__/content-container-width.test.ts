import { readdirSync, readFileSync, statSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

// Contents do dashboard usam todos a mesma largura: o padrão do Container (5xl).
// Loja, auth e compartilhados (fora de dashboard/) têm larguras próprias.
const root = path.resolve(__dirname, '..')

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return name === '__tests__' ? [] : tsxFiles(full)
    return full.endsWith('.tsx') ? [full] : []
  })
}

const contents = tsxFiles(path.join(root, 'components/content'))
const dashboardContents = tsxFiles(path.join(root, 'components/content/dashboard'))
const read = (file: string) => readFileSync(file, 'utf8')
const rel = (file: string) => path.relative(root, file)

describe('largura dos contents', () => {
  it('nenhum Container dos contents do dashboard define width (todos ficam no padrão 5xl)', () => {
    const offenders = dashboardContents.filter((file) => /<Container\b[^>]*\swidth=/.test(read(file))).map(rel)

    expect(offenders).toEqual([])
  })

  it('nenhum content fixa max-w-* no className do Container (a largura vem da prop width)', () => {
    const offenders = contents.filter((file) => /<Container\b[^>]*className="[^"]*\bmax-w-/.test(read(file))).map(rel)

    expect(offenders).toEqual([])
  })
})
