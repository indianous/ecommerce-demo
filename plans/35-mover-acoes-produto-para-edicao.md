# 35 — Mover "Tornar Indisponível" e "Excluir" da lista pra página de edição

## Contexto

`components/admin/EmployeeManagementTable.tsx`, `SolicitacoesContent.tsx` etc. já têm
o mesmo tipo de ação destrutiva/de estado em linha de tabela — este plano só mexe em
produtos, que é onde foi pedido.

`app/(employee)/dashboard/products/ProductsContent.tsx` também está no escopo dos
planos #32 (padronizar tabela pro `Table` do base-ds), #33 (busca só no botão) e #34
(filtros de categoria/disponibilidade viram `FilterDropdown`) — os quatro planos
mexem no mesmo arquivo. Não há conflito de abordagem entre eles, mas quem for
implementar deve fazer os quatro nessa ordem ou juntos, pra não escrever o mesmo
teste novo (`ProductsContent.test.tsx`, que hoje não existe) quatro vezes em paralelo
— o primeiro plano implementado cria o arquivo, os seguintes só estendem.

## 1. Problemas encontrados

`app/(employee)/dashboard/products/ProductsContent.tsx:135-151` — coluna "Ações" da
tabela tem 3 botões por linha, todos atrás do mesmo guard `canManageProducts &&`:
`Editar` (Pencil), `Tornar Indisponível/Disponível` (EyeOff/Eye,
`PATCH /api/admin/products/{id}/status`) e `Excluir` (Trash2,
`DELETE /api/admin/products/{id}`, sem nenhuma confirmação — clique único já exclui).

`app/(employee)/dashboard/products/[id]/edit/ProductEditContent.tsx` (a página de
destino) hoje só tem o `ProductForm` e um link "Voltar"/"Ver avaliações" — não carrega
`product.status`/`product.active` em lugar nenhum (só usa os campos que entram no
`ProductFormState`, que não inclui status/disponibilidade).

`canManageProducts` (checado por botão na lista) é redundante com o
`PermissionGuard permissions={['MANAGE_PRODUCTS']}` que já envolve a página inteira
tanto da lista quanto da edição — quem chega na edição já tem a permissão, então as
ações que forem movidas pra lá não precisam de checagem adicional.

**Decisão que vai além do "mover" literal**: excluir hoje não tem confirmação
nenhuma — um clique já exclui (mesmo sendo soft-delete, recuperável em
`DeletedProductsContent.tsx`). Levar essa ação pra uma página cheia é a hora certa de
adicionar uma confirmação. **Atualização**: essa necessidade virou o plano
[#36](36-dialogs-confirmacao-exclusao.md), que audita *todas* as exclusões do app e
propõe um hook/componente compartilhado (`lib/useConfirmDelete.ts` +
`components/ui/ConfirmDeleteDialog.tsx`) — a confirmação de exclusão de produto usa
essas duas peças em vez de reimplementar o padrão na mão. `Tornar Indisponível`
continua sem confirmação — é reversível com um clique, não some nada.

## 2. Testes a incluir/alterar

- **`ProductsContent.tsx`** (arquivo de teste novo, compartilhado com #32/#33/#34):
  a coluna "Ações" só tem o botão `Editar` — `queryByRole('button', {name: /tornar
  indisponível/i})`/`queryByRole('button', {name: /excluir/i})` não existem mais
  nessa tela.
- **`app/(employee)/__tests__/products.edit.page.test.tsx`** (já existe) — testes
  novos:
  - exibe o status atual do produto (ex. Badge "Disponível"/"Indisponível") e um
    botão pra alternar; clicar chama `PATCH /api/admin/products/:id/status` com o
    status oposto e atualiza o badge sem sair da página.
  - botão "Excluir produto" abre um `Dialog` de confirmação; cancelar não chama a
    API; confirmar chama `DELETE /api/admin/products/:id` e navega pra `backPath`
    (mesmo destino do "Salvar", reaproveitando `pushMock`).
  - regressão: os testes já existentes (heading, pré-preenchimento, submit, 404)
    continuam passando sem mudança.

## 3. O que entra no projeto

- **`ProductsContent.tsx`**: remove os dois `{canManageProducts && (<Button ... Eye
  .../>)}`/`{canManageProducts && (<Button ... Trash2 .../>)}` e os handlers
  `handleToggleStatus`/`handleDelete` (movem inteiros pro edit). Coluna "Ações" fica
  só com "Editar".
- **`ProductEditContent.tsx`**:
  - carrega e guarda `status`/`active` do produto num state próprio (não fazem parte
    de `ProductFormState`), junto do `form` no mesmo `useEffect` que já busca o
    produto.
  - nova seção depois do `ProductForm` (mesmo estilo de `<section>` já usado em
    `EmployeeDetailContent.tsx` pras Permissões): heading "Ações", `Badge` com o
    status atual, `Button` "Tornar Indisponível"/"Tornar Disponível" (chama
    `handleToggleStatus`, reaproveitando a lógica de `ProductsContent.tsx` tal como
    está — mesmo endpoint, mesmo payload) e `Button variant="danger"` "Excluir
    produto" ligado a `useConfirmDelete`/`ConfirmDeleteDialog` (plano #36).
  - `handleDelete` bem-sucedido navega pra `backPath` (`router.push`, igual ao que
    "Salvar" já faz).
