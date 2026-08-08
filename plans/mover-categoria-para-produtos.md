# Mover cadastro de categorias de "Gestão do Site" para "Gestão de Produtos"

## 1. Problemas encontrados

- `frontend/app/(employee)/dashboard/site/SiteContent.tsx:400-410` — card "Categorias" (com botão "Nova") está dentro da página de gestão do site, mas categoria é domínio de produto.
- `SiteContent.tsx:46-47` — estado `categoryName`/`categorySaving` misturado com o restante do estado de site.
- `SiteContent.tsx:179-195` — `handleCategorySave` (`POST /api/admin/categories`) vive dentro do componente de site.
- `SiteContent.tsx:531-533` — `Dialog` "Nova categoria" declarado dentro de site.
- `SiteContent.tsx:18-21` — tipo `DialogId` inclui `"categories"`, que deixa de existir aqui.
- `SiteContent.tsx:11` — import de `CategoryForm` deixa de ser necessário em site.
- `SiteContent.tsx:328` — `PermissionGuard permissions={["MANAGE_SITE"]}` envolve a página inteira. Isso hoje bloqueia um employee com `MANAGE_PRODUCTS` (mas sem `MANAGE_SITE`) de criar categoria pela UI, embora o backend (`AdminCategoryController.java:20`) exija apenas `MANAGE_PRODUCTS`. Mover a ação para dentro de produtos (guardada por `MANAGE_PRODUCTS`, já usado em `ProductsContent.tsx:134`) corrige essa inconsistência entre frontend e backend.
- `frontend/app/(employee)/dashboard/products/ProductsContent.tsx` — já busca categorias (`GET /api/categories`, linha 51) só para popular o filtro; não existe ação de criar categoria nessa tela.
- `frontend/app/(employee)/__tests__/employee.site.page.test.tsx:334-365` — `describe('SiteContent — salvar categorias', ...)` precisa sair daqui.
- `frontend/app/(employee)/__tests__/products.page.test.tsx` — não cobre criação de categoria; precisa ganhar os testes equivalentes.
- Backend, BFF e rotas do App Router **não têm problema** — endpoint (`admin/` package, `MANAGE_PRODUCTS`) e rotas BFF (`app/api/admin/categories`, `app/api/categories`) já tratam categoria como parte do domínio de produto. Mudança é só de UI.

## 2. Testes a incluir/alterar

**`frontend/app/(employee)/__tests__/employee.site.page.test.tsx`**
- Remover `describe('SiteContent — salvar categorias', ...)` (linhas 334-365) e o mock de `POST /api/admin/categories` associado.
- Remover/ajustar qualquer assertion que espere o card "Categorias" renderizado na página de site.

**`frontend/app/(employee)/__tests__/products.page.test.tsx`**
- Adicionar `describe('ProductsContent — criar categoria', ...)` com:
  - botão "Nova categoria" visível quando usuário tem `MANAGE_PRODUCTS` (e ausente/desabilitado quando não tem, seguindo o mesmo padrão do botão "Novo produto").
  - abrir o dialog via botão → botão "Salvar" desabilitado com nome vazio.
  - `POST /api/admin/categories` com sucesso → toast de sucesso, dialog fecha, nova categoria passa a existir na lista usada pelo filtro (`GET /api/categories` recarregado ou lista local atualizada).
  - `POST /api/admin/categories` com erro → toast destructive, dialog permanece aberto.

**`frontend/components/forms/CategoryForm.tsx`**
- Sem alteração (componente puro, já testado indiretamente); continua sem teste dedicado, seguindo o padrão do projeto.

## 3. O que entra no projeto

- **Tipos**: nenhuma alteração — `Category` já existe em `types`.
- **Backend**: nenhuma alteração — `AdminCategoryController` já está no pacote `admin/`, exige `MANAGE_PRODUCTS`, testado em `AdminProductControllerIT`.
- **BFF**: nenhuma alteração — `app/api/admin/categories/route.ts` (POST) e `app/api/categories/route.ts` (GET) já existem fora do namespace `api/site/*`.
- **Componentes**:
  - `ProductsContent.tsx`: adicionar estado (`categoryName`, `categorySaving`, `categoryDialogOpen`), `handleCategorySave` (`POST /api/admin/categories`; ao sucesso, atualiza a lista `categories` local e fecha o dialog), botão "Nova categoria" ao lado de "Novo produto" (visível só quando `canManageProducts`), e `Dialog` reaproveitando `CategoryForm` (já existente, sem alteração).
  - `SiteContent.tsx`: remover card "Categorias" (linhas 400-410), remover `"categories"` de `DialogId`, remover estado/handler/`Dialog` relacionados a categoria, remover import de `CategoryForm`.
- **Páginas**: nenhuma rota muda — `app/(employee)/dashboard/products/page.tsx`, `app/(admin)/dashboard/admin/products/page.tsx`, `app/(employee)/dashboard/site/page.tsx` e `app/(admin)/dashboard/admin/site/page.tsx` continuam apontando para os mesmos componentes (`ProductsContent`/`SiteContent`, compartilhados entre employee e admin); só o conteúdo interno desses componentes muda.
