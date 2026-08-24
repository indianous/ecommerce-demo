# 40 — Padronização das páginas de gestão (Header/Body + Content Header/Body/Footer)

Plano irmão: `backend/plans/40-padronizacao-paginas-gestao.md` (busca combinada
nos endpoints — pré-requisito de várias telas abaixo).

## Contexto e decisões confirmadas com o usuário

- **Página** (nível externo, hoje = o próprio `*Content.tsx`): **2 seções** —
  Header (título) + Body (ações do objeto-alvo + o Content).
- **Content** (dentro do Body): **3 seções** — Header (busca) + Body (tabela) +
  Footer (paginação).
- **Busca**: **um único campo** de texto livre por tela (não dois campos
  separados). Backend casa o termo contra identificador único (id/e-mail/
  telefone/código) **e** identificador comum (nome/título) via `OR`, servidor
  decide onde procurar — exemplo do usuário: buscar cliente por id, e-mail,
  telefone ou nome no mesmo campo.
- **Abordagem técnica**: criar componentes de layout reutilizáveis (não repetir
  a estrutura manualmente em cada arquivo).

## Escopo — as 14 páginas de gestão

`ProductsContent`, `DeletedProductsContent`, `CustomersContent`,
`EmployeesContent`, `AdminsContent`, `EmployeeOrdersContent` (compartilhada
entre `/dashboard/orders` e `/dashboard/admin/orders`), `ShippingContent`,
`PaymentsContent`, `SolicitacoesContent` (só o branch de lista — o branch de
detalhe inline, `SolicitacoesContent.tsx:108-192`, fica fora), `AuditLogsContent`,
`StockContent`, `StockMovementHistoryContent`, `ExpiringLotsContent`,
`ProductReviewsModerationContent`. Fora do escopo: páginas de detalhe/edição de
um único objeto (`OrderDetailContent`, `CustomerDetailContent`,
`EmployeeDetailContent`/`EmployeeFuncionarioDetailContent`,
`ProductEditContent`/`ProductCreateContent`, `PaymentConfirmContent`) e páginas
que não são listagem (`AnalyticsContent`, `DashboardContent`,
`NavigationContent`, `SiteContent`).

## 1. Problemas encontrados

### 1.1 Inconsistência estrutural entre as 14 páginas hoje

- `ProductsContent.tsx:136-144`: título + botões "Nova categoria"/"Novo
  produto" já ficam juntos no topo da página — é o layout mais próximo do
  padrão-alvo (ação no Header/Body da página, fora do Content).
- `EmployeesContent.tsx`/`AdminsContent.tsx` **não** seguem esse padrão: o
  botão de criar e o `Dialog`+`EmployeeForm` de criação vivem dentro de
  `EmployeeManagementTable.tsx:80-82,103-113` (componente compartilhado), e a
  `PaginationBar` também é renderizada internamente ali
  (`EmployeeManagementTable.tsx:99`) — ou seja, a "ação" e o "footer" da
  página, pro usuário final, estão hoje dentro do componente de tabela, não no
  Body/Content da página como nas outras 12 telas.
- `SolicitacoesContent.tsx`: um único componente alterna entre lista
  (`:219-268`) e detalhe de uma solicitação (`:108-192`) via `useState`, sem
  rota própria. A padronização Header/Body só se aplica ao branch de lista.
- `ProductReviewsModerationContent.tsx:86-95`: não usa `Table` do base-ds — é
  uma lista de `ProductReviewCard` num `<div>` mapeado. Não tem "Body =
  tabela" hoje.

### 1.2 Busca ausente — 8 das 14 páginas não têm nenhum campo de busca hoje

`DeletedProductsContent`, `ShippingContent`, `PaymentsContent`,
`AuditLogsContent`, `StockContent`, `StockMovementHistoryContent`,
`ExpiringLotsContent`, `ProductReviewsModerationContent`. Precisam de busca
**adicionada**, não só reposicionada. As outras 6 (`ProductsContent`,
`CustomersContent`, `EmployeesContent`, `AdminsContent`, `EmployeeOrdersContent`,
`SolicitacoesContent`) já usam `SearchField` do base-ds — que já garante o
padrão "busca só dispara no clique/submit" do plano #33 (`SearchField` não
expõe `onChange` por tecla, só `onSearch`, ver `node_modules/base-ds/dist/index.d.ts:598-609`) —
então nenhuma delas precisa de trabalho extra pra manter esse comportamento.

### 1.3 Paginação ausente

- `StockContent.tsx:21-57`: usa `useState`/`useEffect`/`fetch` cru, sem
  `usePaginatedFetch`/`PaginationBar`; chama `/api/admin/products?active=true`
  sem `page`/`size` (`:45`) — o endpoint já pagina de verdade (mesmo do
  `ProductsContent`), só falta o wiring.
- `ProductReviewsModerationContent.tsx:22-41`: fetch fixo com `?size=50`
  (`:28`), sem `usePaginatedFetch`. Endpoint (`GET /products/{id}/reviews`) já
  aceita `page`/`size` (usado pela página pública de catálogo, plano #39).

### 1.4 Backend: busca combinada incompleta ou inexistente (detalhe no plano irmão)

Resumo — só o `search` já pronto pode ser ligado direto no frontend
(`ProductsContent`/`DeletedProductsContent`/`StockContent`,
`EmployeeOrdersContent`/`ShippingContent`/`PaymentsContent`,
`EmployeesContent`/`AdminsContent`); os demais (`CustomersContent` — falta
telefone/id; `SolicitacoesContent` — falta e-mail do solicitante;
`AuditLogsContent`/`StockMovementHistoryContent`/`ExpiringLotsContent`/
`ProductReviewsModerationContent` — não existe `search` no backend ainda)
dependem do plano de backend #40 antes ou em paralelo.

## 2. Testes a incluir/alterar (agrupados por arquivo)

**Componentes novos de layout** (um `__tests__` cada, em
`components/layout/__tests__/`):
- `ManagementPageHeader.test.tsx`: renderiza o título como heading; renderiza
  subtítulo opcional quando passado (caso `ShippingContent`, que tem
  "Pedidos confirmados aguardando envio").
- `ManagementPageBody.test.tsx`: renderiza o slot de ações quando passado;
  não quebra quando `actions` é omitido (caso `CustomersContent`,
  `EmployeeOrdersContent` etc., que não têm botão de criar); renderiza
  `children` (o Content) sempre.
- `ManagementContentHeader.test.tsx`: renderiza a busca (via `SearchField`)
  chamando `onSearch` só no clique/submit, não por tecla; renderiza slot de
  filtros extras (`FilterDropdown`s) quando passado.
- `ManagementContentBody.test.tsx`: renderiza `children`; mostra estado de
  loading (`Skeleton`) e estado vazio (mensagem em português) via props.
- `ManagementContentFooter.test.tsx`: não renderiza nada quando
  `totalPages <= 1`; renderiza `PaginationBar` chamando `onPageChange` quando
  `totalPages > 1` — repete os casos já cobertos individualmente em cada
  tela hoje (ex. `ShippingContent.test.tsx:147-182`), centralizados aqui.

**`EmployeeManagementTable.test.tsx`**: remover as asserções do botão de criar
e do `Dialog`/`EmployeeForm` embutido (saem do componente); remover a
asserção de `PaginationBar` interna. Componente passa a só renderizar a
tabela em si (`Body` da nova estrutura).

**Por página** (`components/content/*Content.tsx` e seus `__tests__`
correspondentes, ver mapa de arquivos de teste no plano de auditoria #39):
adaptar cada teste pra continuar passando com a nova estrutura JSX (título
dentro de `ManagementPageHeader`, tabela dentro de `ManagementContentBody`
etc. — `getByRole`/`getByText` não devem quebrar, já que a estrutura é só
reorganização de wrapper, não muda texto/roles visíveis), e:

- `ProductsContent.test.tsx`, `CustomersContent.test.tsx`,
  `EmployeesContent.test.tsx`, `AdminsContent.test.tsx`,
  `OrdersContent.test.tsx` (employee), `SolicitacoesContent.test.tsx`: já têm
  os testes de "digita não dispara"/"clica dispara com `?search=`" — só
  confirmar que continuam passando após a migração pro novo `ManagementContentHeader`.
- `DeletedProductsContent.test.tsx`, `ShippingContent.test.tsx`,
  `PaymentsContent.test.tsx`, `page.test.tsx` (audit-logs, stock, stock/[id],
  stock/expiring), `ProductReviewsModerationContent.test.tsx`: **novos** casos
  — "digitar no campo de busca não dispara nova chamada à API" e "clicar no
  botão de busca dispara a chamada com `?search=`" (mesmo padrão das 6 telas
  que já têm, ver ex. `AdminsContent.test.tsx:91,102`).
- `page.test.tsx` (stock — `StockContent`): novos casos de paginação, no
  padrão já usado nas outras 13 telas do plano #39 ("URL com `?page=2` carrega
  a página 2 direto", "clicar em Next page atualiza a URL").
- `ProductReviewsModerationContent.test.tsx`: idem paginação, **mais**
  ajuste dos testes existentes que hoje esperam renderização em cards — texto
  e estrutura de asserção mudam pra `getByRole('row'|'cell', ...)` já que o
  Body passa a ser uma `Table`.

**Backend**: ver seção 2 de `backend/plans/40-padronizacao-paginas-gestao.md`.

## 3. O que entra no projeto

### Backend → BFF
Ver `backend/plans/40-padronizacao-paginas-gestao.md` seção 3. No frontend,
só `app/api/admin/audit-logs/route.ts` precisa de mudança (parar de bloquear
`search` na whitelist de params) — os demais BFFs já fazem forward verbatim
de todos os query params.

### Componentes novos (`components/layout/`)
- **`ManagementPageHeader`**: `{ title: string; description?: string }` →
  `Heading` + `Text` opcional. Substitui o `<Heading>` solto no topo de cada
  uma das 14 páginas.
- **`ManagementPageBody`**: `{ actions?: ReactNode; children: ReactNode }` →
  `<div>` com a linha de ações (quando houver) e o Content abaixo. Onde hoje
  o botão de criar mora dentro de `EmployeeManagementTable`
  (`EmployeesContent`/`AdminsContent`), ele sobe pro `actions` desta página,
  igual `ProductsContent` já faz hoje.
- **`ManagementContentHeader`**: `{ onSearch: (term: string) => void;
  searchPlaceholder?: string; filters?: ReactNode }` → `SearchField` do
  base-ds + slot pros `FilterDropdown`s que cada página já usa (categoria/
  status/permissão/motivo/etc., mantidos como estão, só reposicionados).
- **`ManagementContentBody`**: `{ loading: boolean; empty: boolean;
  emptyMessage: string; children: ReactNode }` → padroniza o
  `Skeleton`/mensagem vazia em PT-BR que cada tela já implementa um pouco
  diferente, envolvendo a `Table` (ou, no caso de `ProductReviewsModerationContent`
  depois de migrado, também uma `Table`).
- **`ManagementContentFooter`**: `{ page: number; totalPages: number;
  onPageChange: (page: number) => void }` → `PaginationBar`, escondida quando
  `totalPages <= 1` (mesma regra já usada nas 13 telas do plano #39).

Decisão em aberto pra confirmar antes de implementar: esses 5 componentes são
composição específica deste app (Table/SearchField/PaginationBar do base-ds
+ layout de página), não primitivas de design system — proposta é mantê-los
locais em `components/layout/`, sem abrir issue no `base-ds`. Se o usuário
achar que faz sentido virar padrão do design system (outros apps usando
`base-ds` teriam o mesmo tipo de tela de listagem), aí sim abre issue lá antes
de implementar aqui.

### `EmployeeManagementTable.tsx` (refatoração)
Remove o botão de criar (`:80-82`), o `Dialog`+`EmployeeForm` embutidos
(`:103-113` em diante) e a `PaginationBar` interna (`:99`) — vira só a tabela
(`columns`/`sort`/estado vazio/loading). `EmployeesContent.tsx` e
`AdminsContent.tsx` passam a: (a) botão de criar + `Dialog`/`EmployeeForm` no
próprio arquivo (dentro do `actions` do `ManagementPageBody`, réplica do que
`ProductsContent` já faz com o `Dialog` de categoria), e (b) `ManagementContentFooter`
próprio, com o `page`/`totalPages`/`goToPage` que já vêm do `usePaginatedFetch`
existente.

### As 14 páginas (`components/content/*.tsx`)
Todas migram para:
```tsx
<ManagementPageHeader title="..." />
<ManagementPageBody actions={/* botão de criar, quando existir */}>
  <ManagementContentHeader onSearch={...} filters={/* FilterDropdowns */} />
  <ManagementContentBody loading={loading} empty={items.length === 0} emptyMessage="...">
    <Table ... />
  </ManagementContentBody>
  <ManagementContentFooter page={page} totalPages={totalPages} onPageChange={goToPage} />
</ManagementPageBody>
```
Além da migração estrutural, cada página recebe (quando ainda não tem):
- **Busca**: `DeletedProductsContent` (nome/id — mesmo endpoint de
  `ProductsContent`), `ShippingContent`/`PaymentsContent` (nº pedido/cliente/
  e-mail — mesmo endpoint de `EmployeeOrdersContent`), `AuditLogsContent`
  (entityId/actorEmail, após o backend #40), `StockContent` (nome/id/códigos,
  mesmo endpoint de `ProductsContent`), `StockMovementHistoryContent`
  (lote/quem, após backend #40), `ExpiringLotsContent` (lote/produto, após
  backend #40), `ProductReviewsModerationContent` (nome de quem avaliou, após
  backend #40).
- **Paginação**: `StockContent` (migrar pra `usePaginatedFetch`),
  `ProductReviewsModerationContent` (migrar pra `usePaginatedFetch` **e** pra
  `Table` do base-ds, abandonando os `ProductReviewCard`s — mudança visual,
  vale confirmar com o usuário antes de implementar já que review tem texto
  longo, que numa tabela pode ficar apertado).
- **Backend**: `CustomersContent` (telefone/id no `search`, backend #40),
  `SolicitacoesContent` (e-mail do solicitante no `search`, backend #40).
