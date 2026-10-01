# 78 — Atualizar o `@indianous/base-ds` de 0.4.10 para 0.5.4 — frontend

Só frontend. O app está na 0.4.10, e a última versão é a 0.5.4. A série muda de 0.4 para 0.5, então o
`npm update` não instala a versão nova sozinho. A atualização tem que ser feita de propósito, junto com os
ajustes que a 0.5.0 exige.

## Contexto

### O que muda entre a 0.4.10 e a 0.5.4 (CHANGELOG do base-ds)

| Versão | Mudança | Ajuste no app |
| --- | --- | --- |
| 0.4.11 | Build ESM dividido por componente: o base-ds passa de ~951 KB para ~34 KB na página | O `@source` precisa apontar para a **pasta** `dist`. Já aponta (`app/globals.css:10`) |
| 0.4.12 | `Image` carrega em modo lazy por padrão. Props `priority`, `sizes`, `imageComponent` | Recomendado, não obrigatório: `priority` na imagem principal da página. Fica fora deste plano |
| 0.4.13–0.4.15 | Props para traduzir textos fixos em inglês (`Dialog`, `Pagination`, `Table`, `FileUpload`, `Toast`, `Sidebar`, gráficos, `MultiSelect`, `TagsInput` etc.). O padrão continua o texto de antes | Nenhum. Fica fora deste plano |
| **0.5.0** | Os textos fixos em português do `FilterDropdown` ("Selecionar todos", "Limpar", "Aplicar") e do `MultiSelect` ("Nenhum resultado") viraram props com padrão **em inglês** | **Obrigatório**: passar os textos em português. Sem isso, os botões passam a aparecer em inglês |
| 0.5.1–0.5.2 | `Code`, `CodeBlock`, tokens de realce, subpaths `tokens` e `tailwind-preset` | Nenhum |
| 0.5.3 | Correção: `Button asChild`, `FormField`, `Tooltip`, `DropdownMenu` e `Sidebar` quebravam com elemento vindo de Server Component no `next dev` | Nenhum |
| 0.5.4 | `Breadcrumb` ganha `linkComponent` e anel de foco | Nenhum |

O `KanbanBoard` também mudou na 0.5.0, mas o app não o usa.

### Onde o app usa os componentes afetados

| Arquivo | Uso |
| --- | --- |
| `components/content/dashboard/sales/SolicitacoesContent.tsx` | 1 `FilterDropdown` (Status) |
| `components/content/dashboard/sales/EmployeeOrdersContent.tsx` | 2 `FilterDropdown` (Status, Origem) |
| `components/content/dashboard/people/EmployeesContent.tsx` | 1 `FilterDropdown` (Permissão) |
| `components/content/dashboard/catalog/ProductsContent.tsx` | 3 `FilterDropdown` (Categoria, Promoção, Disponibilidade) |
| `components/content/dashboard/system/AuditLogsContent.tsx` | 2 `FilterDropdown` (Tipo de entidade, Ação) |
| `components/content/dashboard/catalog/StockMovementHistoryContent.tsx` | 1 `FilterDropdown` (Motivo) |
| `components/forms/ProductForm.tsx` | 1 `MultiSelect` (Categorias) |

### Decisões

| Ponto | Decisão |
| --- | --- |
| Versão alvo | `^0.5.4`, a última. Não vale parar na 0.4.15: o ajuste da 0.5.0 teria que ser feito do mesmo jeito depois |
| Onde ficam os textos | `lib/base-ds-labels.ts` exporta `FILTER_DROPDOWN_LABELS` (`selectAllLabel`, `clearLabel`, `applyLabel`) e `MULTI_SELECT_LABELS` (`emptyMessage`). Cada uso faz `{...FILTER_DROPDOWN_LABELS}`. São 10 usos: repetir os três textos em cada um espalharia 30 literais |
| Wrapper local do `FilterDropdown` | Não. O CLAUDE.md pede o componente do base-ds direto, e um objeto de props resolve sem criar componente |
| Proteção contra regressão | Teste de estrutura, como o `no-nested-main`: todo `<FilterDropdown` e todo `<MultiSelect` em `components/` e `app/` recebe as props em português. Assim um filtro novo não nasce em inglês |
| Textos opcionais da 0.4.13–0.4.15 e `priority` da 0.4.12 | Ficam para um plano próprio, se você quiser. Hoje esses componentes mostram os mesmos textos de antes |

## 1. Problemas encontrados

| Arquivo | Linha | Diagnóstico |
| --- | --- | --- |
| `package.json` | 16 | `"@indianous/base-ds": "^0.4.10"`: não alcança a 0.5 |
| `components/content/dashboard/sales/SolicitacoesContent.tsx` | 236 | `FilterDropdown` sem os textos: na 0.5 aparece "Select all", "Clear" e "Apply" |
| `components/content/dashboard/sales/EmployeeOrdersContent.tsx` | 158, 164 | Idem |
| `components/content/dashboard/people/EmployeesContent.tsx` | 196 | Idem |
| `components/content/dashboard/catalog/ProductsContent.tsx` | 160, 166, 176 | Idem |
| `components/content/dashboard/system/AuditLogsContent.tsx` | 128, 134 | Idem |
| `components/content/dashboard/catalog/StockMovementHistoryContent.tsx` | 111 | Idem |
| `components/forms/ProductForm.tsx` | 144 | `MultiSelect` sem `emptyMessage`: na 0.5 aparece "No results" |

## 2. Testes a incluir/alterar

Os testes de filtro que já existem clicam em `/aplicar/i`. Depois do `npm install` da 0.5.4, e antes do código
novo, eles **falham**, o que confirma o problema. Eles são:

- `app/(employee)/__tests__/employee.pedidos.page.test.tsx`
- `app/(employee)/__tests__/employee.solicitacoes.page.test.tsx`
- `app/(employee)/__tests__/products.page.test.tsx`
- `app/(employee)/dashboard/orders/__tests__/OrdersContent.test.tsx`
- `app/(employee)/dashboard/change-requests/__tests__/SolicitacoesContent.test.tsx`
- `app/(employee)/dashboard/employees/__tests__/EmployeesContent.test.tsx`
- `app/(employee)/dashboard/stock/[id]/__tests__/page.test.tsx`
- `app/(admin)/dashboard/admin/audit-logs/__tests__/page.test.tsx`

Nenhum deles cobre "Selecionar todos", "Limpar" nem o "Nenhum resultado".

### `__tests__/base-ds-labels.test.ts` (novo)

1. Todo arquivo `.tsx` de `components/` e `app/`, fora de `__tests__`, que renderiza `<FilterDropdown` passa
   `{...FILTER_DROPDOWN_LABELS}` em cada ocorrência. A mensagem de erro aponta o arquivo e a linha.
2. Idem para `<MultiSelect` com `{...MULTI_SELECT_LABELS}`.
3. Sanidade: o teste encontra ao menos os 10 `FilterDropdown` e o 1 `MultiSelect` de hoje, para não passar à toa se
   a busca quebrar.

### `lib/__tests__/base-ds-labels.test.ts` (novo)

1. `FILTER_DROPDOWN_LABELS` é `{ selectAllLabel: 'Selecionar todos', clearLabel: 'Limpar', applyLabel: 'Aplicar' }`.
2. `MULTI_SELECT_LABELS` é `{ emptyMessage: 'Nenhum resultado' }`.

### `app/(employee)/dashboard/orders/__tests__/OrdersContent.test.tsx`

1. Novo: abrir o filtro de status mostra os botões "Selecionar todos", "Limpar" e "Aplicar", e nenhum "Select all",
   "Clear" ou "Apply". Um teste de tela basta para o render: os outros usos ficam cobertos pelo teste de estrutura.

### `components/forms/__tests__/ProductForm.test.tsx`

1. Novo, em "ProductForm — categorias": digitar no combobox um termo que não bate com nenhuma categoria mostra
   "Nenhum resultado", e não "No results".

## 3. O que entra no projeto

1. **Dependência**: `"@indianous/base-ds": "^0.5.4"` no `package.json` e `npm install` (com
   `GITHUB_PACKAGES_TOKEN`). Rodar os testes: os de filtro devem falhar.
2. **Testes**: os da seção 2, todos falhando.
3. **`lib/base-ds-labels.ts`**: `FILTER_DROPDOWN_LABELS` e `MULTI_SELECT_LABELS`, `as const`, tipados com
   `Pick<FilterDropdownProps, ...>` e `Pick<MultiSelectProps, ...>` do base-ds.
4. **Contents**: `{...FILTER_DROPDOWN_LABELS}` nos 10 `FilterDropdown` dos 6 arquivos.
5. **`ProductForm`**: `{...MULTI_SELECT_LABELS}` no `MultiSelect`.
6. **Verificação**: `npm test`, `npx tsc --noEmit`, lint dos arquivos tocados e `npm run build`. Subir o ambiente
   completo.

## O que o usuário verifica

1. Painel → Pedidos, Solicitações, Funcionários, Produtos, Auditoria e histórico de um item do Estoque: abrir cada
   filtro mostra "Selecionar todos", "Limpar" e "Aplicar", e aplicar filtra como antes.
2. Painel → Produtos → criar ou editar: no campo Categorias, buscar um nome que não existe mostra "Nenhum
   resultado".
3. Navegar pela loja e pelo painel no geral: nada fora do lugar (a 0.4.11 mudou o empacotamento e a 0.4.12 o
   carregamento das imagens).
