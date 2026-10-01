/**
 * A proteção da sincronização com o original: toda chamada ao backend feita pelo app (BFF em app/api e server
 * components) precisa ter resposta no backend falso. Se um `git merge upstream/main` trouxer uma tela que chama
 * uma rota nova, este teste diz qual falta.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { handle, registeredRoutes } from '../fake-backend/handler'
import { asAdmin, data } from './fake-backend-helpers'

const APP_DIR = path.join(__dirname, '../../app')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return name === '__tests__' || name === 'demo-backend' ? [] : walk(full)
    return /\.(ts|tsx)$/.test(name) ? [full] : []
  })
}

/** Converte o trecho depois de `${API}` numa path com `:p` no lugar dos parâmetros; a query é descartada. */
export function normalizePath(raw: string): string {
  let text = raw.replace(/\$\{[^}]*$/, '') // interpolação aberta no fim (query montada com template aninhado)
  text = text.replace(/\/\$\{[^}]*\}/g, '/:p') // parâmetro de path
  text = text.replace(/\$\{[^}]*\}/g, '') // interpolação colada no texto = query
  return text.split('?')[0].replace(/\/+$/, '') || '/'
}

interface BackendCall {
  method: string
  path: string
  file: string
}

function backendCalls(): BackendCall[] {
  const calls = new Map<string, BackendCall>()
  for (const file of walk(APP_DIR)) {
    const source = readFileSync(file, 'utf8')
    if (!source.includes('API_INTERNAL_URL')) continue
    const pattern = /\$\{API\}([^`]*)`/g
    let m: RegExpExecArray | null
    while ((m = pattern.exec(source))) {
      const after = source.slice(m.index, m.index + 400).split('${API}')[1] ?? ''
      const method = /method:\s*['"](\w+)['"]/.exec(after)?.[1] ?? 'GET'
      const call = { method, path: normalizePath(m[1]), file: path.relative(APP_DIR, file) }
      calls.set(`${call.method} ${call.path}`, call)
    }
  }
  return [...calls.values()].sort((a, b) => a.path.localeCompare(b.path))
}

function routeExists(method: string, callPath: string) {
  const segments = callPath.split('/').filter(Boolean)
  return registeredRoutes.some((route) => {
    const [routeMethod, pattern] = route.split(' ')
    const routeSegments = pattern.split('/').filter(Boolean)
    return (
      routeMethod === method &&
      routeSegments.length === segments.length &&
      routeSegments.every((s, i) => s.startsWith(':') || segments[i] === ':p' || s === segments[i])
    )
  })
}

const calls = backendCalls()
const reads = calls.filter((c) => c.method === 'GET')
const writes = calls.filter((c) => c.method !== 'GET')

describe('normalizePath', () => {
  it.each([
    ['/catalog/products/${id}`', '/catalog/products/:p'],
    ['/products/${id}/reviews${qs}`', '/products/:p/reviews'],
    ['/admin/orders?${params}`', '/admin/orders'],
    ['/notifications${query ? ', '/notifications'],
    ['/catalog/products/${path}?limit=8`', '/catalog/products/:p'],
  ])('%s → %s', (raw, expected) => {
    expect(normalizePath(raw.replace(/`$/, ''))).toBe(expected)
  })
})

describe('cobertura do backend falso', () => {
  it('encontra as chamadas do BFF e dos server components', () => {
    expect(reads.length).toBeGreaterThan(50)
    expect(writes.length).toBeGreaterThan(50)
    expect(calls.some((c) => c.file.startsWith('(public)'))).toBe(true)
  })

  it.each(reads.map((c) => [`${c.method} ${c.path}`, c] as const))('%s tem consulta no backend falso', (_, call) => {
    expect({ call: `${call.method} ${call.path}`, file: call.file, registered: routeExists(call.method, call.path) }).toEqual({
      call: `${call.method} ${call.path}`,
      file: call.file,
      registered: true,
    })
  })

  it.each(writes.map((c) => [`${c.method} ${c.path}`, c] as const))('%s responde sem erro', (_, call) => {
    const id = data.products[0].id
    const response = handle(
      { method: call.method, path: call.path.replace(/:p/g, id), query: new URLSearchParams(), headers: { authorization: `Bearer ${asAdmin.token}`, 'content-type': 'application/json' }, body: {} },
      data,
      Date.parse(data.generatedAt),
    )
    expect(response.status).toBeLessThan(500)
  })
})
