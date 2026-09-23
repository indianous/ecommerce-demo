# 60 — Gestão de categorias (CRUD) — frontend

Plano irmão: `backend/plans/60-gestao-de-categorias.md`. Ele cria os
endpoints `GET/PUT/DELETE /admin/categories` e o slug gerado no servidor. Este
lado depende dele para funcionar de ponta a ponta. Os testes daqui usam MSW e
podem ser escritos antes.

## Contexto

Hoje só dá para **criar** uma categoria, e só por um diálogo escondido na tela
de produtos ("Nova categoria"). Não existe tela para listar, editar ou excluir.
Este plano cria a tela **Categorias** no grupo **Catálogo** do menu, para admin
e para funcionário com `MANAGE_PRODUCTS`.

### Contrato da API (definido no plano do backend)

| Método e rota | Corpo | Resposta |
| --- | --- | --- |
| `GET /admin/categories` | — | `200 [{ id, name, slug, description, productCount }]`, ordenado por nome |
| `POST /admin/categories` | `{ name, slug?, description? }` | `201` · `400` · `409` slug repetido |
| `PUT /admin/categories/{id}` | `{ name, slug?, description? }` | `200` · `400` · `404` · `409` |
| `DELETE /admin/categories/{id}` | — | `204` · `404` · `409` com a mensagem "Categoria em uso por N produto(s)…" |

---

## 1. Problemas encontrados

- **F1** — Não existe a rota `dashboard/categories` nem `dashboard/admin/categories`,
  nem o item de menu (`EmployeeShell.tsx:19-21` e `AdminShell.tsx:17-19` têm só
  Produtos, Estoque e Excluídos no grupo Catálogo).
- **F2** — `app/api/admin/categories/route.ts`: só tem `POST`. Faltam `GET` e a
  rota `[id]` com `PUT`/`DELETE`.
- **F3** — `components/forms/CategoryForm.tsx`: só tem o campo nome. Para editar,
  faltam slug e descrição.
- **F4** — `ProductsContent.tsx:41-43, 73-97, 170, 216-218`: o diálogo "Nova
  categoria" fica duplicado com a tela nova e gera um slug ingênuo
  (`toLowerCase` + espaços → hífen). **Decidido:** remover o botão e o diálogo,
  porque a tela de categorias passa a ser o único lugar de cadastro. O filtro por
  categoria da listagem continua.

---

## 2. Testes a incluir/alterar

### `app/api/admin/categories/__tests__/route.test.ts` (novo)

- `GET` repassa o `Authorization` e devolve a lista.
- `POST` repassa corpo e `Authorization` (já existe a rota, falta o teste).

### `app/api/admin/categories/[id]/__tests__/route.test.ts` (novo)

- `PUT` repassa corpo, `Authorization` e o id na URL.
- `DELETE` repassa `Authorization`, devolve 204, e devolve 409 com a mensagem do
  backend.

### `app/(employee)/dashboard/categories/__tests__/CategoriesContent.test.tsx` (novo)

MSW + `useAuthStore` com um funcionário com `MANAGE_PRODUCTS`.

- Lista as categorias com nome, slug e contagem de produtos.
- Estado vazio: mensagem "Nenhuma categoria cadastrada".
- "Nova categoria" abre o Dialog. Preencher nome e salvar faz `POST` sem slug
  quando o campo slug fica vazio, fecha o Dialog, mostra toast de sucesso e a
  categoria aparece na lista.
- Editar abre o Dialog com os campos preenchidos, e salvar faz `PUT /api/admin/categories/:id`.
- 409 ao salvar (slug duplicado): toast com a mensagem do backend e o Dialog
  continua aberto.
- Excluir categoria sem produtos: confirma no `ConfirmDeleteDialog` → `DELETE`, e
  ela sai da lista.
- Excluir categoria com produtos: o botão fica desabilitado com tooltip "Em uso
  por N produtos" (a regra real fica no backend, isto só evita o clique inútil).
- Funcionário sem `MANAGE_PRODUCTS`: `replace('/dashboard')` (`PermissionGuard`).
- Form testado via `within(dialog).getByRole(...)`, conforme a convenção. O
  `CategoryForm` não tem validação própria, então não ganha teste separado.

### `app/(admin)/dashboard/admin/categories/__tests__/page.test.tsx` (novo)

- A página do admin renderiza o `CategoriesContent` e o admin vê a lista.

### Menu

- Testes dos shells (`EmployeeShell`/`AdminShell`): o item **Categorias** aparece
  no grupo Catálogo, entre Produtos e Estoque. No funcionário, só com
  `MANAGE_PRODUCTS`.

### `ProductsContent.test.tsx` (alterar, F4)

- Remover os casos do diálogo "Nova categoria".
- **Novo:** o botão "Nova categoria" não aparece mais.

### `__tests__/content-container-width.test.ts` e `content-structure.test.ts`

- Devem continuar passando sem mudança: o content novo fica em
  `dashboard/catalog/`, que já existe, e usa `<Container>` sem `width`.

---

## 3. O que entra no projeto

### Tipos

1. **`types/index.ts`**: `AdminCategory extends Category { productCount: number }`
   e `CategoryInput { name: string; slug?: string; description?: string }`.

### BFF

2. **`app/api/admin/categories/route.ts`**: acrescentar `GET` ao lado do `POST`.
3. **`app/api/admin/categories/[id]/route.ts`** (novo): `PUT` e `DELETE`, no mesmo
   padrão de `app/api/site/distribution-centers/[id]/route.ts`.

### Componentes

4. **`components/forms/CategoryForm.tsx`**: vira um form controlado com
   `value: CategoryInput` + `onChange(value)` e os campos Nome (`Input`), Slug
   (`Input`, com a dica "Deixe em branco para gerar a partir do nome") e Descrição
   (`Textarea`). O submit e o botão continuam no form, como hoje, no padrão do
   `DistributionCenterForm`. Sem estado próprio. O filtro do catálogo usa o
   slug na URL (`/catalog?category=<slug>`), então na edição a dica do slug
   avisa que trocar o slug quebra links já compartilhados. A navegação do site
   não guarda slugs de categoria, então ela não é afetada.
5. **`components/content/dashboard/catalog/CategoriesContent.tsx`** (novo):
   - `<Container>` sem `width`, com `PermissionGuard permissions={['MANAGE_PRODUCTS']}`.
   - `Heading` "Categorias" + botão "Nova categoria" (`Button` com ícone `FolderPlus`).
   - `Table` do base-ds com as colunas Nome, Slug, Produtos e ações (editar e excluir
     com `Button` `iconOnly` + `aria-label`, que já traz o tooltip).
   - `Dialog` de criar/editar com o `CategoryForm` (estado `{ mode: 'new' } | { mode: 'edit', category }`,
     como no `DistributionCentersContent`).
   - Exclusão via `useConfirmDelete` + `ConfirmDeleteDialog`.
   - Chamadas com `authFetch`, e toast de sucesso ou erro (mensagem do backend no 409).
   - `Skeleton` no loading e texto no estado vazio.
6. **`ProductsContent.tsx`** (F4): remover o botão, o diálogo e os estados
   `categoryDialogOpen`/`categoryName`/`categorySaving`/`handleCategorySave`.
7. **Menu**: item `{ label: 'Categorias', href: '…/categories', icon: 'Tags', group: CATALOGO }`
   no `AdminShell` e no `EmployeeShell` (este com `perms: ['MANAGE_PRODUCTS']`),
   entre Produtos e Estoque.

### Páginas

8. **`app/(employee)/dashboard/categories/page.tsx`** e
   **`app/(admin)/dashboard/admin/categories/page.tsx`**: só renderizam o
   `CategoriesContent` e exportam `metadata` com o título, no padrão das outras
   páginas do dashboard.

### Verificação

- `npm test`, `npx tsc --noEmit`, lint dos arquivos tocados e `npm run build`
  (o plano cria rotas novas).
- Com o backend do plano irmão no ar, subir o ambiente completo. O usuário
  confere, como admin e como funcionário com `MANAGE_PRODUCTS`: criar, editar e
  excluir uma categoria; tentar excluir uma em uso; ver que a tela de produtos
  não tem mais "Nova categoria".
