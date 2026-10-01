import { readdirSync, readFileSync, statSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

// Desde a 0.5.0 do base-ds, o FilterDropdown e o MultiSelect têm textos com padrão em inglês.
// Todo uso no app recebe os textos em português de lib/base-ds-labels.ts (plano #78).
const root = path.resolve(__dirname, '..')
const dirs = ['components', 'app']

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return name === '__tests__' ? [] : tsxFiles(full)
    return full.endsWith('.tsx') ? [full] : []
  })
}

/** Cada abertura de `<Componente` com a tag inteira, até o `/>` ou o `>` que a fecha. */
function usages(component: string) {
  return dirs
    .flatMap((dir) => tsxFiles(path.join(root, dir)))
    .flatMap((file) => {
      const source = readFileSync(file, 'utf8')
      const tag = new RegExp(`<${component}[\\s>][\\s\\S]*?(\\/>|\\n\\s*>)`, 'g')
      return [...source.matchAll(tag)].map((match) => ({
        where: `${path.relative(root, file)}:${source.slice(0, match.index).split('\n').length}`,
        tag: match[0],
      }))
    })
}

describe('textos em português dos componentes do base-ds', () => {
  it('todo FilterDropdown recebe {...FILTER_DROPDOWN_LABELS}', () => {
    const found = usages('FilterDropdown')
    expect(found.length).toBeGreaterThanOrEqual(10)
    expect(found.filter((u) => !u.tag.includes('{...FILTER_DROPDOWN_LABELS}')).map((u) => u.where)).toEqual([])
  })

  it('todo MultiSelect recebe {...MULTI_SELECT_LABELS}', () => {
    const found = usages('MultiSelect')
    expect(found.length).toBeGreaterThanOrEqual(1)
    expect(found.filter((u) => !u.tag.includes('{...MULTI_SELECT_LABELS}')).map((u) => u.where)).toEqual([])
  })
})
