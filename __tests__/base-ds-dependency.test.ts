import { readdirSync, readFileSync, statSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '..')
const readJson = (file: string) => JSON.parse(readFileSync(path.join(root, file), 'utf8'))

/** Arquivos .ts/.tsx/.css das pastas do app (sem node_modules, .next e plans). */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.(tsx?|css)$/.test(name) ? [full] : []
  })
}

const SOURCE_DIRS = ['app', 'components', 'contexts', 'lib', 'stores', 'types', '__tests__']

describe('dependência do base-ds', () => {
  it('é instalada pelo nome com escopo, com versão semver: nunca alias npm: nem file: (symlink)', () => {
    const pkg = readJson('package.json')

    expect(pkg.dependencies['base-ds']).toBeUndefined()
    expect(pkg.dependencies['@indianous/base-ds']).toMatch(/^\^?\d+\.\d+\.\d+/)
  })

  it('o lock resolve o pacote no registry do GitHub Packages', () => {
    const lock = readJson('package-lock.json')

    expect(lock.packages['node_modules/base-ds']).toBeUndefined()
    expect(lock.packages['node_modules/@indianous/base-ds'].resolved).toMatch(/^https:\/\/npm\.pkg\.github\.com\//)
  })

  it('nenhum arquivo do app importa pelo nome antigo "base-ds" (o Dependabot não resolve o alias)', () => {
    // qualquer 'base-ds' entre aspas (import, require.resolve, vi.mock) ou o caminho antigo em node_modules;
    // este arquivo fica de fora porque cita o nome antigo de propósito
    const offenders = SOURCE_DIRS.flatMap((dir) => sourceFiles(path.join(root, dir)))
      .filter((file) => file !== __filename)
      .filter((file) => /['"]base-ds['"/]|node_modules\/base-ds/.test(readFileSync(file, 'utf8')))

    expect(offenders.map((file) => path.relative(root, file))).toEqual([])
  })

  it('o Dependabot só está liberado para @indianous/base-ds', () => {
    const config = readFileSync(path.join(root, '.github/dependabot.yml'), 'utf8')
    const allowed = [...config.matchAll(/dependency-name:\s*['"]?([^'"\s]+)/g)].map((m) => m[1])

    expect(allowed).toEqual(['@indianous/base-ds'])
  })
})
