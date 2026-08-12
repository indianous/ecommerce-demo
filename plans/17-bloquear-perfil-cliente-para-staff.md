# Bloquear áreas de cliente pra admin/funcionário (frontend)

## Contexto

Complementa `backend/plans/17-bloquear-perfil-cliente-para-staff.md`.
`ADMIN` e `EMPLOYEE` conseguem acessar `/profile` hoje e alterar
nome/e-mail (`ProfileDataForm`) e cadastrar endereço (`AddressForm`)
— área que deveria ser exclusiva de `CUSTOMER`, já que funcionário e
admin têm suas próprias telas de perfil dentro do dashboard
(`/dashboard/profile`, `/dashboard/admin/profile`).

Achei duas causas, não uma:

1. **`middleware.ts` já tem a intenção certa, só não a executa.**
   `CUSTOMER_ROUTES = ['/cart', '/orders', '/profile']` existe, mas o
   `middleware()` só valida `role` pra `isAdminRoute`/`isEmployeeRoute`
   — pra `isCustomerRoute` ele só checa se existe sessão (cookie),
   não se o `role` é `CUSTOMER`. Comparando com o bloco de
   `isAdminRoute`/`isEmployeeRoute` logo abaixo, é claramente uma
   omissão, não uma decisão — o `role` já é lido do cookie um pouco
   antes, só não é usado nesse ramo.
2. **`UserMenu.tsx` é o caminho que a staff realmente usa pra chegar
   lá.** O dropdown do avatar já esconde "Dashboard" corretamente por
   `role` (`ADMIN`→`/dashboard/admin`, `EMPLOYEE`→`/dashboard`), mas
   os itens "Perfil" (`/profile`), "Meus Pedidos" (`/orders`) e
   "Minhas Avaliações" (`/reviews`) aparecem **pra qualquer usuário
   autenticado**, sem checar `role`. É por aqui que um admin ou
   funcionário acaba em `/profile` sem nem precisar digitar a URL.

Sobre "senha" mencionada no pedido: o formulário de trocar senha
(`ChangePasswordForm.tsx`) é o **mesmo componente** usado nas 3 telas
de perfil (cliente, funcionário, admin) e chama o mesmo endpoint
compartilhado (`PATCH /api/v1/users/me/password` — ver plano de
backend). Bloqueando `/profile` pra staff, eles deixam de ter acesso
à troca de senha *por ali*, mas continuam trocando a senha
normalmente pela própria tela de perfil do dashboard — não é uma
funcionalidade que está sendo removida, só o caminho duplicado que é
fechado.

`/reviews` não foi citado no pedido, mas está na mesma situação:
mesmo item do `UserMenu` mostrado pra todo `role`, mesma característica
de ser conteúdo de cliente (avaliação de produto comprado), e hoje
**nem está no `matcher` do middleware** — nenhum controle de acesso
nenhum, nem de autenticação. Incluí junto por ser exatamente a mesma
causa; avise se preferir deixar de fora.

`/checkout` continua de fora de propósito — suporta checkout sem
login (`CheckoutAuth.tsx` mostra login/cadastro inline quando não há
`accessToken`), então não é um caso de "esqueceram de proteger".

## 1. Problemas encontrados

- `middleware.ts` (linhas do bloco `if (!isCustomerRoute...)` até o
  fim da função) — `role` só é validado pra `isAdminRoute`/
  `isEmployeeRoute`; `isCustomerRoute` passa qualquer `role`
  autenticado.
- `middleware.ts` — `CUSTOMER_ROUTES`/`matcher` não incluem
  `/reviews`, que hoje não tem controle de acesso nenhum (nem
  exigência de login).
- `components/layout/UserMenu.tsx` — itens "Perfil"/"Meus Pedidos"/
  "Minhas Avaliações" são incondicionais (não filtram por
  `user?.role`), diferente do item "Dashboard" logo acima que já usa
  `dashboardHref` calculado por `role`.

## 2. Testes a incluir/alterar

- `middleware.test.ts` (verificar se já existe; se não, criar
  `__tests__/middleware.test.ts` na raiz do frontend, testando a
  função `middleware` isolada com `NextRequest` mockado, mesmo padrão
  usado nos testes de rota BFF)
  - `EMPLOYEE` acessando `/profile` → redirect pra `/`
  - `ADMIN` acessando `/cart` → redirect pra `/`
  - `EMPLOYEE`/`ADMIN` acessando `/reviews` → redirect pra `/`
  - `CUSTOMER` acessando `/profile`, `/cart`, `/orders`, `/reviews` →
    `NextResponse.next()` (sem redirect) — regressão
  - sem sessão em `/reviews` → redirect pra `/login?callbackUrl=...`
    (comportamento novo, hoje `/reviews` não tem esse gate)
  - `EMPLOYEE` em `/dashboard` e `ADMIN` em `/dashboard/admin`
    continuam passando — regressão dos casos já existentes

- `components/layout/__tests__/UserMenu.test.tsx` (verificar se
  existe; criar se não)
  - `role: 'CUSTOMER'` → dropdown mostra "Perfil", "Meus Pedidos",
    "Minhas Avaliações", **não** mostra "Dashboard"
  - `role: 'EMPLOYEE'` → dropdown mostra "Dashboard" (→
    `/dashboard`), **não** mostra "Perfil"/"Meus Pedidos"/"Minhas
    Avaliações"
  - `role: 'ADMIN'` → dropdown mostra "Dashboard" (→
    `/dashboard/admin`), mesma ausência dos 3 itens de cliente
  - não autenticado → continua mostrando só o link "Entrar"
    (regressão)

## 3. O que entra no projeto

Sem tipos novos.

### `middleware.ts`

```ts
const CUSTOMER_ROUTES = ['/cart', '/orders', '/profile', '/reviews']
```

```ts
if (isCustomerRoute && role !== 'CUSTOMER') {
  return NextResponse.redirect(new URL('/', request.url))
}
```

(inserido junto dos outros dois blocos `if`, mesmo formato de
`isAdminRoute`/`isEmployeeRoute` logo acima)

```ts
export const config = {
  matcher: [
    '/cart/:path*',
    '/orders/:path*',
    '/profile/:path*',
    '/reviews/:path*',
    '/dashboard/:path*',
    '/products/:path*',
  ],
}
```

### `components/layout/UserMenu.tsx`

```tsx
items={[
  ...(dashboardHref ? [{ label: 'Dashboard', href: dashboardHref }, { type: 'separator' as const }] : []),
  ...(user?.role === 'CUSTOMER'
    ? [
        { label: 'Perfil', href: '/profile' },
        { label: 'Meus Pedidos', href: '/orders' },
        { label: 'Minhas Avaliações', href: '/reviews' },
      ]
    : []),
  { type: 'separator' },
  { label: 'Sair', onClick: handleLogout, danger: true },
]}
```

### Fora de escopo

- `/checkout` continua sem gate de autenticação — suporta compra sem
  login por design.
- Backend (`@PreAuthorize` em `UserController`/`AddressController`) —
  ver `backend/plans/17-bloquear-perfil-cliente-para-staff.md`. O
  fix de frontend sozinho já impede a staff de *chegar* na tela, mas
  sem o backend um `PATCH /api/v1/users/me` direto (fora da UI) ainda
  funcionaria pra qualquer `role` — os dois planos são necessários
  juntos pra fechar o problema de verdade, não só escondê-lo na
  navegação.
