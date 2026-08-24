# 46 — Renovar o access token automaticamente em 401 + skeleton até resposta definitiva

## Contexto

Diagnóstico desta sessão (confirmado pelos logs de `/tmp/frontend.log` e pelo
código): o access token dura 15 min (`JWT_EXPIRATION_MS`). `hydrateSession()`
(`stores/auth.store.ts:107-115`) só roda **uma vez**, no mount do
`AuthHydrator` (`components/layout/AuthHydrator.tsx:6-9`, renderizado uma vez
em `components/layout/RootProviders.tsx:17` — o layout raiz não remonta em
navegação client-side). Passados os 15 min, toda chamada autenticada volta
401 e **nada intercepta isso** — cada um dos ~33 arquivos que fazem
`fetch(..., { headers: { Authorization: \`Bearer ${accessToken}\` } })`
trata `!res.ok` como erro definitivo na hora, mostra toast/mensagem de erro.
Só um F5 de verdade resolve (remonta o `AuthHydrator`, que busca um token
novo via cookie httpOnly de refresh).

Pedido do usuário, em duas partes:
1. Renovar o token automaticamente quando um 401 acontece, e repetir a
   requisição — sem exigir F5.
2. Enquanto isso estiver rolando (ou enquanto qualquer carregamento estiver
   em andamento), mostrar **skeleton**, não erro — erro só depois de uma
   resposta definitiva: ou a sessão foi perdida de verdade (refresh também
   falhou), ou os dados realmente não puderam ser carregados (erro que não é
   de autenticação).

## Estado atual

- `lib/api-client.ts` (`apiRequest`) existe mas **não é usado em lugar
  nenhum** (`grep` confirma zero imports) — código morto, não é o client
  usado hoje.
- Os ~33 arquivos que hoje fazem fetch autenticado repetem o mesmo padrão
  manual: pegam `accessToken` do `useAuthStore`, montam o header
  `Authorization` na mão, checam `res.ok`. Nenhum deles sabe se um 401
  significa "token expirou, dá pra tentar de novo" ou "sem permissão de
  verdade" — tratam os dois igual.
- As 14 páginas de gestão (plano #40) já mostram `Skeleton` de verdade
  durante o carregamento, via `ManagementContentBody`
  (`components/layout/ManagementContentBody.tsx`) — **essas já ficam
  corretas de graça** assim que a causa raiz for corrigida, porque o
  `loading` delas já cobre a chamada inteira (inclusive qualquer retry
  interno, desde que a chamada de fetch continue sendo um único `await`).
- Outras telas **não** usam `Skeleton`, mostram texto solto
  ("Carregando...") ou nada: pelo menos `CheckoutContent.tsx`,
  `CustomerOrdersContent.tsx` (`app/(customer)/orders`), `ReviewsContent.tsx`,
  `SiteContent.tsx`, `NavigationContent.tsx`, `components/product/ProductGrid.tsx`
  — candidatas a padronizar pra `Skeleton`, a confirmar cada uma no momento
  da implementação (a lista acima não é exaustiva, vale conferir as demais
  telas autenticadas fora das 14 de gestão).
- `middleware.ts` já redireciona pra `/login?callbackUrl=<path>` quando não
  há cookie de sessão — mas `LoginContent.tsx:9-16` **ignora esse parâmetro**
  hoje, sempre manda o usuário pra raiz do dashboard do seu role, não pra
  onde ele estava tentando ir. Fica estranho se eu implementar "sessão
  perdida → volta pro login com callbackUrl" sem isso funcionar de verdade
  no fim da jornada — incluído no escopo aqui, é pequeno.

## 1. Problemas encontrados

- Causa raiz: nenhum retry-on-401 em lugar nenhum do frontend (confirmado
  por busca ampla nesta sessão — zero tratamento de `status === 401` fora do
  fluxo de login).
- `hydrateSession` mistura duas responsabilidades (renovar o token E buscar
  `/api/auth/me`) — pra virar reaproveitável num retry, precisa separar "só
  renovar o token" de "renovar e recarregar o usuário" (a segunda parte só
  faz sentido uma vez, no boot da aplicação).
- Sem essa separação e sem um mecanismo de "dedupe", **vários componentes
  recebendo 401 ao mesmo tempo** (comum — várias chamadas disparam juntas
  quando uma página monta) disparariam vários `POST /api/auth/refresh` em
  paralelo — desnecessário e pode causar corrida (dois refreshes voltando
  fora de ordem). Precisa de um refresh "compartilhado": a primeira chamada
  que recebe 401 dispara o refresh, as demais esperam a mesma promise em vez
  de disparar a sua própria.
- `callbackUrl` gerado pelo `middleware.ts` não é consumido pelo login —
  gap pré-existente, pequeno, incluído aqui pra fechar o fluxo.

## 2. Testes a incluir/alterar (agrupados por arquivo)

- **Novo `lib/__tests__/authFetch.test.ts`** (o núcleo da correção):
  - 200 na primeira tentativa → devolve a resposta, sem chamar refresh.
  - 401 na primeira tentativa, refresh com sucesso → repete a requisição
    original com o token novo, devolve a segunda resposta (200).
  - 401 na primeira tentativa, refresh **também** 401/falha → não fica
    tentando de novo (só 1 retry), trata como sessão perdida (dispara o
    callback/redirect de sessão expirada em vez de devolver a resposta
    crua pro chamador tratar como erro genérico).
  - duas chamadas simultâneas recebendo 401 ao mesmo tempo → só **um**
    `POST /api/auth/refresh` é disparado (dedupe), as duas são repetidas
    depois que ele resolve.
  - erro não-401 (500, network error) → nenhum retry, devolve/propaga
    normalmente pro chamador (mantém o comportamento de erro genérico que já
    existe hoje nos ~33 arquivos).
- **`stores/auth.store.ts` — testes existentes ajustados** (a extração de
  `refreshAccessToken` não pode quebrar os testes atuais de `hydrateSession`):
  `hydrateSession` continua com o mesmo comportamento observável de fora
  (chama refresh, busca `/api/auth/me`, seta `user`); novo teste isolado pra
  `refreshAccessToken` (só token, sem tocar `user`).
- **Por arquivo migrado** (os ~33, ver seção 3): não precisa de teste novo
  na maioria — a migração troca `fetch` por `authFetch` mantendo a mesma URL
  e mesmo shape de resposta, os testes existentes (MSW) continuam batendo
  no mesmo endpoint e devem continuar passando sem alteração. Só ganham
  teste novo os arquivos que também mudarem de "Carregando..." pra
  `Skeleton` (asserção do `role="status"`/`Skeleton` no lugar do texto).
- **`LoginContent.test.tsx`**: login com `?callbackUrl=/dashboard/admin/orders`
  na URL redireciona pra lá em vez da raiz do dashboard; sem `callbackUrl`,
  comportamento atual (raiz por role) continua.

## 3. O que entra no projeto

### `stores/auth.store.ts`
- Extrai `refreshAccessToken(): Promise<string | null>` — só chama
  `POST /api/auth/refresh`, atualiza `accessToken`/`role`/`isAuthenticated`
  no store, devolve o token novo (ou `null` e limpa o estado de auth se
  falhar). `hydrateSession` passa a chamar esse método por dentro e, só se
  ele der certo, busca `/api/auth/me`.

### `lib/authFetch.ts` (novo)
- Assinatura igual a `fetch` (`authFetch(input, init?) => Promise<Response>`)
  pra migração ser quase mecânica nos ~33 arquivos.
- Lê `accessToken` do `useAuthStore.getState()` e injeta o header
  `Authorization` sozinho — chamador não monta mais esse header na mão.
- Em 401: dispara (ou reaproveita, se já tiver uma em voo — variável de
  módulo guardando a promise em andamento) `refreshAccessToken()`; se vier
  token novo, repete a requisição original **uma vez**; se o retry também
  vier 401 (ou o refresh falhar), trata como sessão perdida: limpa o auth
  store e redireciona (`window.location.href`, hard redirect — precisa ser
  fora de componente React) pra
  `/login?callbackUrl=<path atual>&sessionExpired=1`.
- Erros que não são 401 passam direto, sem retry.

### Os ~33 arquivos com fetch autenticado
Trocam `fetch(url, { headers: { Authorization: ... } })` por
`authFetch(url, { ... })` (sem o header manual). Levantamento exato de todos
os arquivos fica pra hora da implementação (comando de busca já validado
nesta sessão: `grep -rl "Authorization.*Bearer.*accessToken"`), cobre tanto
as 14 páginas de gestão quanto as telas de cliente (carrinho, checkout,
pedidos, perfil, avaliações) e os formulários de configuração do site.

### Skeleton — telas fora das 14 de gestão
`CheckoutContent.tsx`, `CustomerOrdersContent.tsx`, `ReviewsContent.tsx`,
`SiteContent.tsx`, `NavigationContent.tsx`, `ProductGrid.tsx` (lista não
exaustiva, conferir as demais durante a implementação): trocar o
"Carregando..."/estado vazio por `Skeleton` do base-ds, no mesmo padrão já
usado em `ManagementContentBody` (algumas linhas de `Skeleton variant="line"`
dentro de um `role="status"`).

### `/login` — consumir `callbackUrl` e avisar sessão expirada
- `LoginContent.tsx`: lê `callbackUrl` da query string
  (`useSearchParams`) e, se presente, `handleSuccess` navega pra lá em vez
  da raiz do dashboard do role (mantém o fallback por role quando não tem
  `callbackUrl`).
- Se `sessionExpired=1` estiver na query, mostra um aviso (`toast` ou
  `Text` acima do formulário) "Sua sessão expirou — faça login de novo."
