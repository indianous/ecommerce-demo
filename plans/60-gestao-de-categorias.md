# 60 — Gestão de categorias (CRUD)

## Contexto

Hoje só dá para **criar** uma categoria, e só por um diálogo escondido na tela
de produtos ("Nova categoria"). Não existe tela para listar, editar ou excluir.
O backend também só expõe `POST /admin/categories`. Este plano cria a tela
**Categorias** no grupo **Catálogo** do menu, para admin e para funcionário com
`MANAGE_PRODUCTS`, e completa a API.

O plano mexe no backend e no frontend. Fica em `frontend/plans/` porque a
entrega visível é a tela, e a seção 3 segue a ordem tipos → backend → BFF →
componentes → páginas.

---

## 1. Problemas encontrados

### Backend

- **B1** — `admin/AdminCategoryController.java`: só existe `POST`. Faltam
  `GET` (listagem para o painel), `PUT /{id}` e `DELETE /{id}`. A entidade já tem
  `Category.update(name, slug, description)` (`category/Category.java`), mas
  nada a usa.
- **B2** — `AdminCatalogService.createCategory` (linha 283): não confere slug
  duplicado. A coluna `slug` é `unique`, então um slug repetido vira
  `DataIntegrityViolationException` → 500 em vez de 409.
- **B3** — `CreateCategoryRequest`: `slug` é `@NotBlank`, e quem gera o slug é o
  frontend, de forma ingênua (`ProductsContent.tsx:80`, só `toLowerCase` +
  espaços → hífen). "Eletrônicos & Games" vira `eletrônicos-&-games`. O backend
  já tem `product/util/Slugify.slugify`, usado nos produtos.
- **B4** — Exclusão e integridade: `product_categories.category_id` é
  `ON DELETE CASCADE` (`V33__create_product_categories.sql:3`). Excluir uma
  categoria em uso tiraria a categoria dos produtos em silêncio. Um produto que
  só tinha ela ficaria com zero categorias, o que viola a regra
  `Product.replaceCategories` ("ao menos uma categoria"). Isso vale também para
  produtos excluídos (`active = false`), que ao serem restaurados voltariam sem
  categoria. Por isso a exclusão precisa ser **barrada** (409) enquanto qualquer
  produto, ativo ou não, usar a categoria.
- **B5** — `CatalogService.listCategories` (linha 94): `findAll()` sem ordem. A
  ordem na loja e nos selects de produto muda conforme o banco.

### Frontend

- **F1** — Não existe a rota `dashboard/categories` nem `dashboard/admin/categories`,
  nem o item de menu (`EmployeeShell.tsx:19-21` e `AdminShell.tsx:17-19` têm só
  Produtos, Estoque e Excluídos no grupo Catálogo).
- **F2** — `app/api/admin/categories/route.ts`: só tem `POST`. Faltam `GET` e a
  rota `[id]` com `PUT`/`DELETE`.
- **F3** — `components/forms/CategoryForm.tsx`: só tem o campo nome, e o botão
  de salvar fica dentro do form. Para editar, faltam slug e descrição.
- **F4** — `ProductsContent.tsx:41-43, 73-97, 170, 216-218`: o diálogo "Nova
  categoria" fica duplicado com a tela nova e gera o slug ingênuo. **Decidido:
  remover** o botão e o diálogo, porque a tela de categorias passa a ser o único
  lugar de cadastro. O filtro por categoria da listagem continua.

---

## 2. Testes a incluir/alterar

### Backend — `admin/AdminCategoryControllerIT.java` (novo)

TestContainers + TestRestTemplate, no padrão do `AdminProductControllerIT`.

- `GET /admin/categories` como admin → 200, ordenado por nome, com
  `productCount` contando produtos ativos **e** excluídos.
- `GET` como funcionário com `MANAGE_PRODUCTS` → 200. Sem a permissão → 403. Como
  cliente → 403. Sem token → 401.
- `POST` sem slug → 201, com slug gerado pelo `Slugify` a partir do nome
  (`"Eletrônicos & Games"` → `eletronicos-games`).
- `POST` com slug inválido (`"Com Espaço"`) → 400.
- `POST` com slug já existente → 409 (hoje dá 500).
- `PUT /{id}` → 200, nome, slug e descrição atualizados, e registro `UPDATED` no audit log.
- `PUT` com o slug de outra categoria → 409. `PUT` mantendo o próprio slug → 200.
- `PUT` em id inexistente → 404.
- `DELETE /{id}` sem produtos → 204, e registro `DELETED` no audit log.
- `DELETE` com produto ativo usando a categoria → 409, mensagem com a contagem, e a
  categoria continua lá.
- `DELETE` com só produto excluído (`active = false`) usando → 409.
- `DELETE` como funcionário sem `MANAGE_PRODUCTS` → 403.

### Backend — teste do catálogo público

- No IT existente de `CatalogController`: `GET /catalog/categories` devolve em
  ordem alfabética (B5).

### Frontend — `app/api/admin/categories/__tests__/route.test.ts` (novo)

- `GET` repassa o `Authorization` e devolve a lista.
- `POST` repassa corpo e `Authorization` (já existe a rota, falta o teste).

### Frontend — `app/api/admin/categories/[id]/__tests__/route.test.ts` (novo)

- `PUT` repassa corpo, `Authorization` e o id na URL.
- `DELETE` repassa `Authorization`, devolve 204, e devolve 409 com a mensagem do
  backend.

### Frontend — `app/(employee)/dashboard/categories/__tests__/CategoriesContent.test.tsx` (novo)

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

### Frontend — `app/(admin)/dashboard/admin/categories/__tests__/page.test.tsx` (novo)

- A página do admin renderiza o `CategoriesContent` e o admin vê a lista.

### Frontend — menu

- Testes dos shells (`EmployeeShell`/`AdminShell`): o item **Categorias** aparece
  no grupo Catálogo, entre Produtos e Estoque. No funcionário, só com
  `MANAGE_PRODUCTS`.

### Frontend — `ProductsContent.test.tsx` (alterar, F4)

- Remover os casos do diálogo "Nova categoria".
- **Novo:** o botão "Nova categoria" não aparece mais.

### Frontend — `__tests__/content-container-width.test.ts` e `content-structure.test.ts`

- Devem continuar passando sem mudança: o content novo fica em
  `dashboard/catalog/`, que já existe, e usa `<Container>` sem `width`.

---

## 3. O que entra no projeto

### Tipos

1. **`types/index.ts`**: `AdminCategory extends Category { productCount: number }`
   e `CategoryInput { name: string; slug?: string; description?: string }`.

### Backend

2. **`category/dto/CategoryRequest.java`** (substitui `CreateCategoryRequest`, e
   vale para criar e editar): `@NotBlank @Size(max=100) name`,
   `@Size(max=100) @Pattern("^[a-z0-9]+(-[a-z0-9]+)*$") slug` opcional,
   `description` opcional.
3. **`category/dto/AdminCategoryResponse.java`**: `id, name, slug, description, productCount`.
4. **`CategoryRepository`**:
   - `findAllByOrderByNameAsc()`;
   - `existsBySlugAndIdNot(slug, id)`;
   - contagem por categoria numa query só:
     `SELECT category_id, COUNT(*) FROM product_categories GROUP BY category_id`
     (nativa, porque a contagem inclui produtos inativos);
   - `countProductsByCategoryId(id)`.
5. **`AdminCatalogService`**:
   - `listCategories()`: ordenado, com `productCount`.
   - `createCategory(req)`: slug = `req.slug` ou `Slugify.slugify(req.name)`, e
     `ConflictException` se já existir (B2, B3).
   - `updateCategory(id, req)`: 404 se não existir, 409 se o slug for de outra
     categoria, `Category.update(...)`, audit `UPDATED`.
   - `deleteCategory(id)`: 404 se não existir, `ConflictException("Categoria em uso
     por N produto(s). Troque a categoria desses produtos antes de excluir.")` se
     `count > 0` (B4), senão exclui e registra audit `DELETED`.
6. **`AdminCategoryController`**: `GET`, `PUT /{id}` e `DELETE /{id}` (204), todos com
   `@PreAuthorize("hasRole('ADMIN') or @permissionChecker.has(authentication, 'MANAGE_PRODUCTS')")`.
7. **`CatalogService.listCategories`**: usa `findAllByOrderByNameAsc()` (B5).
8. Sem migration: o esquema já comporta tudo. O `ON DELETE CASCADE` fica, porque o
   bloqueio acontece antes, no serviço.

### BFF

9. **`app/api/admin/categories/route.ts`**: acrescentar `GET` ao lado do `POST`.
10. **`app/api/admin/categories/[id]/route.ts`** (novo): `PUT` e `DELETE`, no mesmo
    padrão de `app/api/site/distribution-centers/[id]/route.ts`.

### Componentes

11. **`components/forms/CategoryForm.tsx`**: vira um form controlado com
    `value: CategoryInput` + `onChange(value)` e os campos Nome (`Input`), Slug
    (`Input`, com a dica "Deixe em branco para gerar a partir do nome") e Descrição
    (`Textarea`). O submit e o botão continuam no form, como hoje, no padrão do
    `DistributionCenterForm`. Sem estado próprio. O filtro do catálogo usa o
    slug na URL (`/catalog?category=<slug>`), então na edição a dica do slug
    avisa que trocar o slug quebra links já compartilhados. A navegação do site
    não guarda slugs de categoria, então ela não é afetada.
12. **`components/content/dashboard/catalog/CategoriesContent.tsx`** (novo):
    - `<Container>` sem `width`, com `PermissionGuard permissions={['MANAGE_PRODUCTS']}`.
    - `Heading` "Categorias" + botão "Nova categoria" (`Button` com ícone `FolderPlus`).
    - `Table` do base-ds com as colunas Nome, Slug, Produtos e ações (editar e excluir
      com `Button` `iconOnly` + `aria-label`, que já traz o tooltip).
    - `Dialog` de criar/editar com o `CategoryForm` (estado `{ mode: 'new' } | { mode: 'edit', category }`,
      como no `DistributionCentersContent`).
    - Exclusão via `useConfirmDelete` + `ConfirmDeleteDialog`.
    - Chamadas com `authFetch`, e toast de sucesso ou erro (mensagem do backend no 409).
    - `Skeleton` no loading e texto no estado vazio.
13. **`ProductsContent.tsx`** (F4): remover o botão, o diálogo e os estados
    `categoryDialogOpen`/`categoryName`/`categorySaving`/`handleCategorySave`.
14. **Menu**: item `{ label: 'Categorias', href: '…/categories', icon: 'Tags', group: CATALOGO }`
    no `AdminShell` e no `EmployeeShell` (este com `perms: ['MANAGE_PRODUCTS']`),
    entre Produtos e Estoque.

### Páginas

15. **`app/(employee)/dashboard/categories/page.tsx`** e
    **`app/(admin)/dashboard/admin/categories/page.tsx`**: só renderizam o
    `CategoriesContent` e exportam `metadata` com o título, no padrão das outras
    páginas do dashboard.

### Verificação

- Backend: `./mvnw test`.
- Frontend: `npm test`, `npx tsc --noEmit`, lint dos arquivos tocados e
  `npm run build` (o plano cria rotas novas).
- Subir o ambiente completo. O usuário confere, como admin e como funcionário com
  `MANAGE_PRODUCTS`: criar, editar e excluir uma categoria; tentar excluir uma em
  uso; ver que a tela de produtos não tem mais "Nova categoria".
