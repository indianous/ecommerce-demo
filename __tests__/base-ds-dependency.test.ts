import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '..')
const readJson = (file: string) => JSON.parse(readFileSync(path.join(root, file), 'utf8'))

describe('dependência do base-ds', () => {
  it('é instalada do GitHub Packages por alias, nunca por file: (symlink)', () => {
    const pkg = readJson('package.json')

    expect(pkg.dependencies['base-ds']).toMatch(/^npm:@indianous\/base-ds@/)
  })

  it('o lock resolve o pacote no registry do GitHub Packages', () => {
    const lock = readJson('package-lock.json')

    expect(lock.packages['node_modules/base-ds'].resolved).toMatch(/^https:\/\/npm\.pkg\.github\.com\//)
  })
})
