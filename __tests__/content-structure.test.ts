import { readdirSync, statSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

// Contents organizados por categoria; as do dashboard espelham os grupos do menu lateral
// (components/layout/dashboard-nav-groups.ts). Categoria nova = atualizar este teste e o CLAUDE.md.
const contentDir = path.resolve(__dirname, '../components/content')

const entries = (dir: string) => readdirSync(dir).filter((name) => name !== '__tests__')
const dirsIn = (dir: string) => entries(dir).filter((name) => statSync(path.join(dir, name)).isDirectory()).sort()
const filesIn = (dir: string) => entries(dir).filter((name) => statSync(path.join(dir, name)).isFile())

describe('estrutura de components/content', () => {
  it('nenhum content solto na raiz: todo content está numa categoria', () => {
    expect(filesIn(contentDir)).toEqual([])
  })

  it('as categorias de primeiro nível são auth, store, dashboard e shared', () => {
    expect(dirsIn(contentDir)).toEqual(['auth', 'dashboard', 'shared', 'store'])
  })

  it('as subpastas do dashboard são os grupos do menu: sales, catalog, people, site e system', () => {
    expect(dirsIn(path.join(contentDir, 'dashboard'))).toEqual(['catalog', 'people', 'sales', 'site', 'system'])
  })
})
