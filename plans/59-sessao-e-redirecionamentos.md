# 59 — Sessão e redirecionamentos

## Contexto

Ao abrir direto uma tela do dashboard (F5, link colado, volta do login com
`callbackUrl`), o funcionário é jogado para `/dashboard` e o admin para `/`.
Pelo menu não acontece. A causa é a ordem em que a sessão é restaurada no
cliente, somada ao destino fixo do `PermissionGuard` e às regras do middleware.
Na mesma revisão apareceram outros problemas de sessão, que entram juntos por
mexerem nos mesmos arquivos.

Escopo: só frontend. O backend (`RefreshTokenService`) não muda.

---

## 1. Problemas encontrados

### P1 — `PermissionGuard` redireciona antes do `user` carregar (causa do bug)

- `stores/auth.store.ts:108-113`: `hydrateSession()` chama `refreshAccessToken()`
  e só depois `fetchMe()`.
- `stores/auth.store.ts:127`: `refreshAccessToken()` grava `isAuthenticated: true`
  sem `user`. O `authFetch` faz o mesmo quando uma página dispara um fetch antes
  da hidratação terminar (token nulo → 401 → refresh).
- `components/employee/PermissionGuard.tsx:16-22`: o guard decide pelo
  `isAuthenticated`. Na janela entre o refresh e o `/me`, `user` é `null`,
  `hasAccess` dá `false` e ele chama `router.replace('/dashboard')`.
- `middleware.ts:35`: para o admin, `/dashboard` é rota só de `EMPLOYEE`, então
  ele cai em `/`.

Diagnóstico: o guard precisa decidir pelo `user`, que é o dado que ele de fato
usa, e não pelo `isAuthenticated`. Sem `user`, ele espera sem renderizar nada
e sem redirecionar. Com o guard esperando o `user`, o admin sempre tem acesso
(`user.role === 'ADMIN'`). Por isso o destino `/dashboard` do redirecionamento
só vale para funcionário e não precisa mudar.

### P2 — Redirecionamento aberto no login

- `components/content/auth/LoginContent.tsx:16-17`: `router.push(callbackUrl)`
  aceita qualquer valor. Com `/login?callbackUrl=https://site-falso.com` ou
  `//site-falso.com`, o usuário sai do site logo depois de fazer login.

### P3 — `callbackUrl` ignora o papel do usuário

- `LoginContent.tsx:16`: o `callbackUrl` tem prioridade sobre o papel. Um cliente
  que faz login com `callbackUrl=/dashboard/orders` (por exemplo, depois que a
  sessão de um funcionário expirou no mesmo navegador) vai para essa tela, e o
  middleware o manda para `/` sem aviso. O mesmo vale para admin com
  `callbackUrl=/cart` ou funcionário com `/dashboard/admin/...`.
- Um `callbackUrl` apontando para `/login` ou `/register` também não faz sentido
  depois do login.

Diagnóstico: as regras de "qual papel acessa qual rota" ficam só dentro do
`middleware.ts`. Extrair essas regras para um módulo compartilhado permite que o
login valide o `callbackUrl` com as mesmas regras e, se não bater, use a página
inicial do papel.

### P4 — Refresh concorrente sem deduplicação

- `lib/authFetch.ts:3-12`: a deduplicação (`pendingRefresh`) só vale para
  chamadas do `authFetch`.
- `stores/auth.store.ts:109`: o `hydrateSession()` chama `refreshAccessToken()`
  por fora. No carregamento, o `AuthHydrator` (duas vezes no StrictMode) e os
  fetches da página mandam de 2 a 3 `POST /api/auth/refresh` com o mesmo token.
- Hoje a tolerância de 10s do backend (`RefreshTokenService.rotate`) segura
  isso. Mas se a página navegar antes de a resposta que regrava o cookie chegar,
  o token antigo fica no navegador. O próximo refresh, depois dos 10s, é tratado
  como reuso, e o backend revoga a família inteira: o usuário é deslogado sem
  motivo aparente.

Diagnóstico: a deduplicação vai para dentro do `refreshAccessToken()` do store,
de modo que qualquer caminho compartilha a mesma promise em andamento.

### P5 — Cookie `role` fica sobrando quando o refresh falha

- `app/api/auth/refresh/route.ts:23`: apaga `session`, mas não `role`. Hoje não
  quebra nada, porque o middleware confere `session` primeiro, mas o estado fica
  inconsistente com o logout (`logout/route.ts` apaga os dois).

### P6 — `middleware.ts` depreciado no Next 16

- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:11`:
  o arquivo `middleware` foi renomeado para `proxy`, e a função exportada passa
  a se chamar `proxy`. O `config.matcher` continua igual. O runtime padrão do
  proxy é Node.js, e o código atual só lê cookies e monta URLs, então funciona
  igual nos dois.
- `app/api/auth/login/route.ts:31`: o comentário cita "Edge middleware".

---

## 2. Testes a incluir/alterar

### `components/employee/__tests__/PermissionGuard.test.tsx` (P1)

- **Novo:** `isAuthenticated: true` e `user: null` (sessão restaurada, `/me`
  pendente): não renderiza children **e não chama `replace`**.
- **Novo:** mesmo cenário, depois `setState({ user: <funcionário com a permissão> })`
  dentro de `act`: renderiza children e `replace` nunca foi chamado.
- **Novo:** mesmo cenário para admin (`user` chega com `role: 'ADMIN'`): renderiza
  e não redireciona.
- Os testes atuais continuam valendo sem mudança, porque sempre gravam `user`
  junto com `isAuthenticated`.

### `stores/__tests__/auth.store.test.ts` (P4)

- **Novo:** duas chamadas simultâneas de `refreshAccessToken()` disparam um só
  `POST /api/auth/refresh` (contador no handler do MSW) e devolvem o mesmo token.
- **Novo:** `hydrateSession()` e `refreshAccessToken()` simultâneos → um só POST.
- **Novo:** depois que a promise resolve, uma nova chamada faz outro POST (o
  cache não fica preso).
- **Novo:** depois de uma falha (401), a próxima chamada tenta de novo.

### `lib/__tests__/authFetch.test.ts` (P4)

- O teste atual "duas chamadas simultâneas recebendo 401: só um POST" continua
  valendo e passa a exercitar a deduplicação do store.
- **Novo:** `hydrateSession()` em andamento + `authFetch` recebendo 401 → um só
  `POST /api/auth/refresh`.

### `lib/__tests__/route-access.test.ts` (novo arquivo, P3)

Funções puras extraídas do middleware:

- `requiredRole(pathname)`: `/cart`, `/orders`, `/profile`, `/reviews` → `CUSTOMER`;
  `/dashboard/admin` e subrotas → `ADMIN`; `/dashboard` e `/products` e subrotas
  → `EMPLOYEE` (a mesma lista de hoje no middleware);
  `/catalog/x`, `/` → `null` (pública).
- `homeFor(role)`: `ADMIN` → `/dashboard/admin`, `EMPLOYEE` → `/dashboard`,
  `CUSTOMER`/`null` → `/`.

### `lib/__tests__/post-login-path.test.ts` (novo arquivo, P2 + P3)

`postLoginPath(callbackUrl, role)`:

- `null`/vazio → `homeFor(role)`.
- Caminho válido e permitido para o papel → devolve o próprio caminho, com a
  query preservada (`/orders?page=2`).
- Rejeita e cai em `homeFor(role)`: `https://evil.com`, `//evil.com`,
  `/\evil.com`, `javascript:alert(1)`, `evil.com` (sem `/` inicial).
- Rota de outro papel → `homeFor(role)`: CUSTOMER + `/dashboard/orders`,
  ADMIN + `/cart`, EMPLOYEE + `/dashboard/admin/orders`, ADMIN + `/dashboard/orders`.
- `/login` e `/register` → `homeFor(role)`.
- Rota pública (`/catalog/camiseta`) → devolve o caminho para qualquer papel.

### `app/(auth)/__tests__/login.page.test.tsx` (P2 + P3)

- **Alterar** "com callbackUrl na query string…": o mock de login devolve
  `role: 'CUSTOMER'`, então com a validação `/dashboard/orders` passaria a ir
  para `/`. O teste passa a usar um handler com `role: 'EMPLOYEE'` (como o teste
  "redirects to dashboard… as EMPLOYEE").
- **Novo:** `callbackUrl=https%3A%2F%2Fevil.com` como CUSTOMER → `push('/')`.
- **Novo:** `callbackUrl=%2Fdashboard%2Forders` como CUSTOMER → `push('/')`.
- **Novo:** `callbackUrl=%2Forders` como CUSTOMER → `push('/orders')`.

### `app/api/auth/refresh/__tests__/route.test.ts` (P5)

- **Alterar** "quando o backend rejeita apaga o cookie de sessão e devolve 401":
  também confere que `role` foi apagado.

### `__tests__/middleware.test.ts` → `__tests__/proxy.test.ts` (P6)

- Renomear e importar `{ proxy } from '../proxy'`. Os casos continuam iguais,
  e ficam como teste de regressão da extração para `route-access`.

---

## 3. O que entra no projeto

### Tipos

Nenhum tipo novo; `UserRole` já existe em `@/types`.

### Backend

Nada.

### Lib

1. **`lib/route-access.ts`** (novo): as listas `CUSTOMER_ROUTES` e `ADMIN_ROUTES`
   e a regra de `EMPLOYEE` que hoje estão no `middleware.ts`, expostas como
   `requiredRole(pathname): UserRole | null` e `homeFor(role): string`. Sem
   dependência de `next/server`, para rodar no proxy e no cliente.
2. **`lib/post-login-path.ts`** (novo): `postLoginPath(callbackUrl, role)`. Aceita
   só valores que começam com `/`, não começam com `//` ou `/\`, e cujo `pathname`
   (via `new URL(callbackUrl, 'http://x')`, conferindo que a origem continua
   `http://x`) não é `/login`/`/register` e tem `requiredRole` nulo ou igual ao
   papel. Qualquer outro caso → `homeFor(role)`.
3. **`lib/authFetch.ts`**: remove `pendingRefresh`/`getFreshToken` e chama
   `useAuthStore.getState().refreshAccessToken()` direto, porque a deduplicação
   passa a ser do store.

### Store

4. **`stores/auth.store.ts`**: `refreshAccessToken` guarda a promise em andamento
   numa variável de módulo (mesmo padrão do `authFetch` atual, com `.finally`
   limpando) e devolve essa promise enquanto ela não resolve. `hydrateSession`
   continua chamando `refreshAccessToken()` e passa a herdar a deduplicação.

### BFF

5. **`app/api/auth/refresh/route.ts`**: no ramo `!upstream.ok`, apagar também
   `cookieStore.delete('role')`.
6. **`app/api/auth/login/route.ts:31`**: comentário "Edge middleware" → "proxy".

### Proxy

7. **`middleware.ts` → `proxy.ts`** (`git mv`), função `middleware` → `proxy`,
   usando `requiredRole` de `lib/route-access.ts` em vez das listas locais. O
   `config.matcher` fica igual. Comportamento idêntico, garantido pelo
   `proxy.test.ts`.

### Componentes

8. **`components/employee/PermissionGuard.tsx`**: lê `user` do store e deixa de
   usar `isAuthenticated`. Sem `user` → `return null` sem redirecionar. Com
   `user` e sem acesso → `router.replace('/dashboard')`, como hoje.
9. **`components/content/auth/LoginContent.tsx`**: `handleSuccess` passa a ser
   `router.push(postLoginPath(callbackUrl, useAuthStore.getState().role))`.

### Páginas

Nenhuma mudança.

### Fora do escopo (registrado)

- Se o refresh der certo mas o `/api/auth/me` falhar, `user` fica `null` e o
  guard mostra a tela vazia (hoje ele redireciona para `/dashboard`). É um
  cenário raro (backend fora do ar entre as duas chamadas). Se aparecer, o
  próximo passo é o `hydrateSession` tratar `/me` nulo como sessão inválida.
- `/checkout` não está no matcher do proxy, e isso é intencional (o
  `CheckoutAuth` trata o login ali).

### Verificação

- `npm test` e `npm run lint`.
- `npm run build`, porque o plano mexe no proxy e no fluxo de rotas.
- Subir Postgres + backend + frontend. O usuário confere:
  - F5 em `/dashboard/orders` (funcionário) e `/dashboard/admin/orders` (admin):
    a tela fica onde está;
  - login com `callbackUrl` externo e com `callbackUrl` de outro papel.
