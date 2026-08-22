# 36 — Dialog de confirmação em todas as ações de exclusão

## Contexto

**Atualização 2026-08-22**: [indianous/base-ds#30](https://github.com/indianous/base-ds/issues/30)
foi fechada — `Dialog` passou a usar `useStackedEscape` internamente, então com dois
`Dialog` abertos ao mesmo tempo (banner, ver seção 1) o Escape fecha só o de cima,
não os dois. Não há mais ressalva a aceitar nesse caso.

`app/(employee)/dashboard/products/ProductsContent.tsx`/`ProductEditContent.tsx` já
ficaram de fora daqui — o plano #35 já cobre exclusão de produto com dialog de
confirmação, na página de edição.

## 1. Problemas encontrados

Levantei todo `method: 'DELETE'`/botão `Trash2` do frontend:

| Local | Exclui | Confirmação hoje |
|---|---|---|
| `app/(employee)/dashboard/employees/EmployeesContent.tsx` | Funcionário | **Nenhuma** — clique único já exclui |
| `app/(admin)/dashboard/admin/employees/EmployeesContent.tsx` | Funcionário (arquivo quase idêntico ao de cima) | **Nenhuma** |
| `app/(employee)/dashboard/site/SiteContent.tsx` (`handleBannerRemove`, dentro do dialog "Gerenciar banners") | Banner | **Nenhuma** |
| `app/(employee)/dashboard/site/navigation/NavigationContent.tsx` | Item/coleção de navegação | **Parcial** — só confirma coleção com filhos (aviso de cascata); item folha exclui direto |
| `app/(employee)/dashboard/products/[id]/reviews/ProductReviewsModerationContent.tsx` | Avaliação (moderação) | **Já confirma** — dialog padrão, nada a mudar |
| `app/(customer)/reviews/ReviewsContent.tsx` | Avaliação (própria) | **Já confirma** — dialog padrão, nada a mudar |
| `app/(employee)/dashboard/products/ProductsContent.tsx` → `ProductEditContent.tsx` | Produto | Coberto pelo plano #35 |

**Fora de escopo, de propósito**: remover item do carrinho (`CartCardItem.tsx`) e
tirar produto da lista de desejos (`WishlistButton.tsx`) — não são exclusão de
registro, são ações do próprio usuário sobre o próprio estado, triviais de desfazer
(basta adicionar de novo), e nenhum site de e-commerce confirma isso. Não viram
`ConfirmDeleteDialog`.

**Duplicação a resolver**: os dois casos que já confirmam (`ProductReviewsModerationContent`,
`ReviewsContent`) e os 4 que vão ganhar confirmação nova (`EmployeesContent` × 2,
`SiteContent`, `NavigationContent`) mais o de `ProductEditContent` do plano #35 somam
7 lugares com a mesma forma exata: state `target: T | null`, state `deleting:
boolean`, handler que faz o `DELETE`/atualiza a lista/mostra toast e fecha, e um
`Dialog` com `open={target !== null}` + footer Cancelar/Confirmar. Vale extrair antes
de escrever a 5ª/6ª/7ª cópia manual.

**Nenhum dos dois `EmployeesContent.tsx` tem teste hoje** — a exclusão de funcionário
nunca foi testada.

## 2. Testes a incluir/alterar

- **`lib/__tests__/useConfirmDelete.test.ts`** (novo, hook isolado): `target` começa
  `null`; `setTarget(x)` abre; `confirm()` chama a função de delete passada, depois
  zera `target`; erro na função de delete não fecha o dialog (deixa o usuário tentar
  de novo) e não deixa `deleting` travado em `true`.
- **`app/(employee)/dashboard/employees/__tests__/EmployeesContent.test.tsx`** e o
  equivalente em `app/(admin)/dashboard/admin/employees/__tests__/` (novos, nenhum
  teste hoje): clicar em excluir abre o dialog com o nome do funcionário; cancelar
  não chama `DELETE`; confirmar chama `DELETE /api/admin/employees/:id` e some da
  lista.
- **`app/(employee)/dashboard/site/__tests__/SiteContent.test.tsx`**: teste novo —
  dentro do dialog "Gerenciar banners", clicar em remover abre confirmação; confirmar
  chama `DELETE /api/site/banners/:id`.
- **`NavigationContent.test.tsx`** (se existir, senão criar): item folha agora também
  abre confirmação antes de excluir (comportamento muda — teste antigo que assumia
  exclusão direta de item folha precisa ajustar).
- Regressão nos 2 que já confirmam, se forem refatorados pro hook compartilhado
  (`ProductReviewsModerationContent.test.tsx`, `ReviewsContent` — nome do arquivo a
  confirmar): mesmas asserções, sem mudança de comportamento esperada.

## 3. O que entra no projeto

- **`lib/useConfirmDelete.ts`** (novo hook): `useConfirmDelete<T>(deleteFn: (item: T)
  => Promise<void>)` devolve `{ target, setTarget, deleting, confirm, cancel }`.
  Encapsula o state `target`/`deleting` e o `try/finally` que hoje é reescrito à mão
  em cada tela.
- **`components/ui/ConfirmDeleteDialog.tsx`** (novo): `Dialog` do base-ds já
  formatado com o footer padrão (`Button` Cancelar `variant="outline"` + Confirmar
  `variant="danger"`, `isLoading={deleting}` no Confirmar), recebendo só
  `open`/`onClose`/`onConfirm`/`deleting`/`title`/`description`/`children`.
- **`EmployeesContent.tsx`** (os dois): trocar `onDelete={handleDelete}` direto por
  `onDelete={setTarget}` do hook + `ConfirmDeleteDialog` novo na página, chamando o
  `fetch DELETE` que já existe dentro da função passada pro hook.
- **`SiteContent.tsx`**: `handleBannerRemove` vira a função passada pro
  `useConfirmDelete`; botão de remover banner chama `setTarget(banner)`;
  `ConfirmDeleteDialog` empilhado sobre o dialog "Gerenciar banners" — Escape fecha só
  o de cima (issue #30 resolvida, `Dialog` já tem stacking).
- **`NavigationContent.tsx`**: unificar — todo item (folha ou coleção) passa a abrir
  confirmação (`performDelete` vira a função do hook); a mensagem da coleção com
  filhos continua avisando sobre a cascata, item folha ganha uma mensagem simples
  ("Remover "{label}"?").
- **Refatoração de consistência (menor prioridade)**: `ProductReviewsModerationContent.tsx`
  e `ReviewsContent.tsx` passam a usar `useConfirmDelete`/`ConfirmDeleteDialog` em vez
  do state manual próprio — sem mudança de comportamento, só reuso.
- **`ProductEditContent.tsx`** (plano #35, quando implementado): já nasce usando
  `useConfirmDelete`/`ConfirmDeleteDialog` em vez de escrever o padrão de novo.
