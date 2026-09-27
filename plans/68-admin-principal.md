# 68 — Admin principal criado pelo `.env` e protegido contra exclusão — frontend

Plano irmão: `backend/plans/68-admin-principal.md`. Ele cria o admin principal na
inicialização (pelo `ADMIN_EMAIL`/`ADMIN_PASSWORD`), recusa a exclusão dele com 403 e
adiciona `primaryAdmin` ao `EmployeeResponse`. Este lado só esconde a exclusão e mostra o
selo. A proteção de verdade é do backend. Os testes daqui usam MSW e podem ser escritos
antes.

## Contexto

Na lista de administradores, o admin principal aparece como qualquer outro: tem a lixeira
e pode ser marcado para a exclusão em lote. O backend recusaria, mas a tela ofereceria uma
ação que sempre falha. Este plano:

- mostra um selo **"Principal"** ao lado do nome, na lista e no detalhe;
- tira a lixeira dessa linha;
- deixa essa linha **sem checkbox** de seleção, e o "Selecionar todos" ignora ela.

Nada muda na lista de funcionários: `primaryAdmin` só é `true` em admins.

## 1. Problemas encontrados

| Arquivo | Linha | Diagnóstico |
| --- | --- | --- |
| `types/index.ts` | 565–575 | `Employee` não tem `primaryAdmin` |
| `components/admin/EmployeeManagementTable.tsx` | 65–71 | A lixeira aparece em toda linha, sem exceção |
| `components/layout/selectionColumn.tsx` | 1–40 | Toda linha é selecionável, e o "Selecionar todos" pega todos os ids. Não há como deixar uma linha de fora |
| `components/content/dashboard/people/EmployeeDetailContent.tsx` | 87–90 | Os selos do detalhe não mostram que o admin é o principal |
| `components/content/dashboard/people/AdminsContent.tsx` | 116–124 | O toast de falha no lote já mostra o `reason` do backend. Continua valendo como rede de segurança, sem mudança |

## 2. Testes a incluir/alterar

### `components/layout/__tests__/selectionColumn.test.tsx` (alterar)

1. Com `isSelectable` recusando um item, essa linha não renderiza checkbox.
2. "Selecionar todos" chama `onToggleAll` só com os ids selecionáveis.
3. O cabeçalho fica marcado quando todos os **selecionáveis** estão selecionados.
4. Sem `isSelectable`, o comportamento atual se mantém (os testes existentes não mudam).

### `components/admin/__tests__/EmployeeManagementTable.test.tsx` (alterar)

1. Linha com `primaryAdmin: true` → mostra o selo "Principal" e **não** tem o botão
   "Excluir <nome>".
2. Linha comum → sem selo e com a lixeira, como hoje.
3. Com `selection`, a linha do principal não tem o checkbox "Selecionar <nome>".

### `app/(admin)/dashboard/admin/admins/__tests__/AdminsContent.test.tsx` (alterar)

1. Lista vinda da API com um principal → selo visível, sem "Excluir" nessa linha.
2. "Selecionar todos" + "Excluir selecionados" → o bulk-delete recebe só os ids dos outros
   admins.

### `app/(admin)/dashboard/admin/__tests__/employee.detail.page.test.tsx` (alterar)

1. Detalhe de um admin com `primaryAdmin: true` → mostra o selo "Principal".
2. Detalhe de um admin comum → sem o selo.

### Mocks

Os fixtures de `Employee` nos testes existentes ganham `primaryAdmin: false`, e o
`tsc --noEmit` aponta os que faltarem.

## 3. O que entra no projeto

### Tipos

`types/index.ts`: `Employee` ganha `primaryAdmin: boolean`.

### Componentes

- `components/layout/selectionColumn.tsx`: novo parâmetro opcional
  `isSelectable?: (item: T) => boolean`, no fim da assinatura para não mexer nas outras 15
  telas que usam a função. Os ids do cabeçalho e o estado "todos/alguns" passam a contar só
  os selecionáveis. A linha não selecionável renderiza vazia.
- `components/admin/EmployeeManagementTable.tsx`:
  - coluna Nome: `<Badge variant="default">Principal</Badge>` depois do nome quando
    `row.primaryAdmin`;
  - coluna Ações: a lixeira só aparece quando `!row.primaryAdmin`;
  - `makeSelectionColumn(..., (e) => !e.primaryAdmin)`.
- `components/content/dashboard/people/EmployeeDetailContent.tsx`: o mesmo selo, ao lado
  do `Badge` de role, quando `employee.primaryAdmin`.

`Badge` já vem do `base-ds` e já é usado nesses arquivos. Não precisa de componente novo
nem de issue.

### Páginas e BFF

Nenhuma mudança: as rotas `app/api/admin/admins/*` e `app/api/admin/employees/*` repassam o
JSON como vem, e o campo novo chega sozinho.

## O que o usuário verifica

1. Em **Pessoas → Administradores**, o admin do `ADMIN_EMAIL` aparece com o selo
   "Principal", sem lixeira e sem checkbox.
2. "Selecionar todos" marca os outros admins, e "Excluir selecionados" exclui só eles.
3. No detalhe desse admin aparece o selo "Principal". Nos outros admins, não.
4. A lista de funcionários continua igual.
