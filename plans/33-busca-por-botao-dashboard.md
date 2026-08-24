# 33 — Busca por texto no dashboard só dispara no botão, não a cada tecla

## Contexto

Levantei todos os campos de busca por texto livre nas telas do dashboard
(`grep` por `type="search"`/`placeholder="Buscar..."` em `app/(employee)/dashboard` e
`app/(admin)/dashboard`) — só existem 4, todos no employee (nenhum no admin).

**Atualização 2026-08-22 — bloqueado por [indianous/base-ds#31](https://github.com/indianous/base-ds/issues/31)**:
o `base-ds` já tem um componente `SearchField`
(`src/components/molecules/SearchField/SearchField.tsx`) que resolve exatamente o
padrão "busca só dispara no submit" deste plano — form + input + botão embutidos.
Mas hoje ele tem `aria-label`/texto do botão/`id` fixos em inglês (`"Search input"`,
`"Search"`, `id="search-field"`), sem prop pra customizar — não dá pra usar num app em
português, e duas instâncias na mesma página colidiriam no `id`. Abri a issue #31
pedindo `label`/`buttonLabel`/`id` customizáveis. **Este plano fica bloqueado até a
issue ser resolvida** — quando fechar, a implementação (seção 3) muda de "replicar
Input+form+Button manual" pra "usar `SearchField` do base-ds" nas 3 telas, e
`CustomersContent.tsx` (hoje a referência do padrão manual) também deveria trocar pro
componente oficial, por consistência.

**Atualização 2026-08-24 — desbloqueado, implementado**: issue #31 fechada
(commit `37fcbf1` no `base-ds`, props `id`/`label`/`buttonLabel`/`buttonIconOnly`
adicionadas ao `SearchField`). Implementação concluída usando `SearchField` nas 4
telas (as 3 com o bug + `CustomersContent.tsx`, por consistência), conforme seção 3.

## 1. Problemas encontrados

| Arquivo | Comportamento hoje |
|---|---|
| `components/customers/CustomersContent.tsx` (`app/(employee)/dashboard/customers/`) | **Já correto** — `<form onSubmit={handleSearch}>` com botão de busca (`Icon="Search"`), `fetchCustomers(q)` recebe o termo como parâmetro explícito, só chamado no submit. Referência de padrão pros outros três. |
| `app/(employee)/dashboard/products/ProductsContent.tsx` | Busca a cada tecla — `fetchProducts` é `useCallback` com `search` nas deps (`[accessToken, search, categoryId, statusFilter]`), disparado por `useEffect(() => { fetchProducts() }, [fetchProducts])`. Sem form, sem botão de busca — só o `<Input type="search">`. |
| `app/(employee)/dashboard/orders/OrdersContent.tsx` | Mesmo problema — `fetchOrders` com `search` nas deps, sem form/botão. |
| `app/(employee)/dashboard/change-requests/SolicitacoesContent.tsx` | Mesmo problema — `fetchRequests` com `search` nas deps, sem form/botão. |

Nenhuma das 4 tem teste hoje (confirmado no levantamento do plano #32) — a correção
das 3 entra junto com teste novo, não só a mudança de comportamento.

**Fora de escopo, de propósito**: os filtros por `Select`/botão-toggle (categoria e
disponibilidade em `ProductsContent`, status em `OrdersContent`/`SolicitacoesContent`)
continuam aplicando na hora, sem botão — o pedido foi especificamente sobre busca por
**input de texto**, e mudar de opção num dropdown ou clicar num botão de filtro já é
uma ação discreta e deliberada, diferente de digitar. Selects/toggles ficam como estão.

## 2. Testes a incluir/alterar

Um arquivo de teste novo por página (`ProductsContent.test.tsx`,
`OrdersContent.test.tsx` em `app/(employee)/dashboard/orders/__tests__/`,
`SolicitacoesContent.test.tsx`), cobrindo pelo menos:

- digitar no campo de busca **não** dispara nova chamada à API (mock de fetch/MSW
  contando as chamadas antes/depois de `user.type(...)`).
- clicar no botão de busca (ou dar submit no form / Enter no campo) dispara a chamada
  com o termo digitado no query param certo (`?search=...`).
- filtro por `Select`/botão continua aplicando imediatamente ao trocar (regressão do
  comportamento atual, que não muda).

## 3. O que entra no projeto

Nas 4 páginas (as 3 do bug + `CustomersContent.tsx`, por consistência), trocar o
`Input`/`FormField`/`Button` de busca montados à mão pelo `SearchField` do `base-ds`
(`id`, `label`, `buttonLabel="Buscar"`, `buttonIconOnly`, `onSearch`).

- `fetchX` passa a receber o termo de busca como parâmetro opcional
  (`fetchProducts(searchTerm?: string)` etc.), lendo de um `useRef<string>` quando
  omitido — remove `search` do array de dependências do `useCallback` (mantém
  `categoryIds`/`statusFilter`, que devem continuar reativos). O `ref` guarda o
  último termo *submetido* (não o que está sendo digitado, que vive só dentro do
  `SearchField`), pra que trocar um filtro dispare `fetchX()` reaproveitando a busca
  já aplicada.
- `handleSearch(value)` atualiza o `ref` e chama `fetchX(value)` — vira o `onSearch`
  do `SearchField`.
- `useEffect` de carga inicial passa a chamar `fetchX()` (sem argumento → usa o `ref`,
  vazio no mount), com deps `[fetchX]` apenas — segue sem reagir a digitação.
- `CustomersContent.tsx` perde o `useState('search')`/`handleSearch` manual — como não
  tem outros filtros reativos, `fetchCustomers` (que já recebia `q: string` explícito)
  vira diretamente o `onSearch` do `SearchField`.

Testes: `ProductsContent.test.tsx` (novo), `OrdersContent.test.tsx` e
`SolicitacoesContent.test.tsx` (describe `— busca` adicionado aos existentes) cobrindo
não-fetch ao digitar e fetch com `?search=` ao clicar em "Buscar". Testes de página
(`employee.pedidos.page.test.tsx`, `employee.solicitacoes.page.test.tsx`,
`products.page.test.tsx`) que assumiam busca a cada tecla foram atualizados para
clicar no botão antes de checar o `search=` no BFF.
