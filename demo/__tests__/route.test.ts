import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { NextRequest } from 'next/server'
import { DELETE, GET, PATCH, POST, PUT } from '@/app/demo-backend/api/v1/[...path]/route'
import data from '../data.json'

const BASE = 'http://localhost:3000/demo-backend/api/v1'
const paramsOf = (url: string) => ({
  params: Promise.resolve({ path: new URL(url).pathname.replace('/demo-backend/api/v1/', '').split('/') }),
})

async function login(email: string) {
  const url = `${BASE}/auth/login`
  const response = await POST(
    new NextRequest(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'x' }) }),
    paramsOf(url),
  )
  return (await response.json()).accessToken as string
}

describe('app/demo-backend/api/v1/[...path]/route.ts', () => {
  it('GET monta a path a partir de params e repassa a query', async () => {
    const url = `${BASE}/catalog/products?size=2&page=1`
    const response = await GET(new NextRequest(url), paramsOf(url))
    expect(response.status).toBe(200)
    const page = await response.json()
    expect(page).toMatchObject({ page: 1, size: 2 })
    expect(page.content).toHaveLength(2)
  })

  it('POST lê o corpo JSON', async () => {
    expect(await login(data.fixedAccounts.admin)).toMatch(/^demo\./)
  })

  it('repassa o header Authorization', async () => {
    const token = await login(data.fixedAccounts.customer)
    const url = `${BASE}/users/me`
    const response = await GET(new NextRequest(url, { headers: { authorization: `Bearer ${token}` } }), paramsOf(url))
    expect((await response.json()).email).toBe(data.fixedAccounts.customer)
  })

  it('resposta sem corpo (401 do filtro, 204) volta sem corpo', async () => {
    const url = `${BASE}/cart`
    const unauthorized = await GET(new NextRequest(url), paramsOf(url))
    expect(unauthorized.status).toBe(401)
    expect(await unauthorized.text()).toBe('')

    const token = await login(data.fixedAccounts.employee)
    const deleteUrl = `${BASE}/admin/products/${data.products[0].id}`
    const deleted = await DELETE(new NextRequest(deleteUrl, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } }), paramsOf(deleteUrl))
    expect(deleted.status).toBe(204)
  })

  it('PUT e PATCH com JSON', async () => {
    const token = await login(data.fixedAccounts.employee)
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' }
    const putUrl = `${BASE}/admin/categories/${data.categories[0].id}`
    const put = await PUT(new NextRequest(putUrl, { method: 'PUT', headers, body: JSON.stringify({ name: 'X' }) }), paramsOf(putUrl))
    expect((await put.json()).name).toBe('X')
    const patchUrl = `${BASE}/admin/products/${data.products[0].id}/status`
    const patch = await PATCH(new NextRequest(patchUrl, { method: 'PATCH', headers, body: JSON.stringify({ status: 'UNAVAILABLE' }) }), paramsOf(patchUrl))
    expect((await patch.json()).status).toBe('UNAVAILABLE')
  })

  it('multipart não é lido e responde com a URL de uma imagem', async () => {
    const token = await login(data.fixedAccounts.employee)
    const form = new FormData()
    form.append('file', new Blob(['x'], { type: 'image/png' }), 'x.png')
    const url = `${BASE}/upload/image`
    const response = await POST(new NextRequest(url, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: form }), paramsOf(url))
    expect((await response.json()).url).toMatch(/^\/demo\/images\//)
  })

  it('CSV volta como texto, com os headers de download', async () => {
    const token = await login(data.fixedAccounts.employee)
    const url = `${BASE}/admin/products/export`
    const response = await GET(new NextRequest(url, { headers: { authorization: `Bearer ${token}` } }), paramsOf(url))
    expect(response.headers.get('content-type')).toMatch(/text\/csv/)
    expect(response.headers.get('content-disposition')).toMatch(/attachment/)
    expect((await response.text()).split('\n')[0]).toMatch(/^id,nome/)
  })
})

describe('bundle da rota', () => {
  // O gerador lê pt-br.json do disco ao carregar; se entrar no bundle da função na Vercel, ela quebra.
  it('o backend falso só importa tipos do gerador', () => {
    const dir = path.join(__dirname, '../fake-backend')
    const files = (function walk(d: string): string[] {
      return readdirSync(d).flatMap((f) => (statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : [path.join(d, f)]))
    })(dir)
    const routeFile = path.join(__dirname, '../../app/demo-backend/api/v1/[...path]/route.ts')
    for (const file of [...files, routeFile]) {
      const valueImports = readFileSync(file, 'utf8').match(/^import\s+(?!type\b)[^'"]*?\s+from\s+'[^']*generator\/generate'/gm)
      expect({ file, valueImports }).toEqual({ file, valueImports: null })
    }
  })
})
