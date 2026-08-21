# 37 — Botão de copiar (clipboard) em dados de contato, só admin/employee

## Contexto

Levantei todo lugar em `app/(admin)` e `app/(employee)` que mostra nome, e-mail ou
telefone de cliente/funcionário. Nenhum componente de clipboard existe hoje no
projeto nem no `base-ds` — mas não é um caso de precisar pedir componente novo:
`Button` (iconOnly) + `Icon="Copy"` + `useToast` já cobrem tudo, é só compor local.

## 1. Problemas encontrados

**Locais com nome/e-mail/telefone de cliente ou funcionário** (dado que faz sentido
copiar pra colar num e-mail, WhatsApp, CRM etc.):

| Arquivo | Contexto | Campos |
|---|---|---|
| `app/(employee)/dashboard/customers/[id]/CustomerDetailContent.tsx` | Detalhe do cliente | nome (`<Heading>`), e-mail (`<p>`), telefone (`<dd>`) |
| `app/(admin)/dashboard/admin/employees/[id]/EmployeeDetailContent.tsx` | Detalhe do funcionário (admin) | nome (`<Heading>`), e-mail (`<p>`) |
| `app/(employee)/dashboard/employees/[id]/EmployeeFuncionarioDetailContent.tsx` | Detalhe do funcionário (employee) | nome (`<Heading>`), e-mail (`<p>`) |
| `app/(employee)/dashboard/orders/[id]/OrderDetailContent.tsx` | Detalhe do pedido | nome do cliente, e-mail do cliente (`<p>`) |
| `app/(employee)/dashboard/payments/[id]/PaymentConfirmContent.tsx` | Confirmar pagamento | nome do cliente (`<p>`) — sem e-mail nessa tela |
| `app/(employee)/dashboard/customers/CustomersContent.tsx` | Lista de clientes | nome, e-mail (coluna de `<table>` nativa) |
| `app/(employee)/dashboard/orders/OrdersContent.tsx` (compartilhado admin/employee) | Lista de pedidos | nome do cliente, e-mail do cliente (coluna de `<table>` nativa) |
| `app/(employee)/dashboard/shipping/ShippingContent.tsx` | Lista de envios | nome do cliente (coluna de `<table>` nativa) |
| `app/(employee)/dashboard/payments/PaymentsContent.tsx` | Lista de pagamentos pendentes | nome do cliente, e-mail do cliente (coluna de `<table>` nativa) |
| `components/admin/EmployeeManagementTable.tsx` (compartilhado admin/employee) | Lista de funcionários | nome, e-mail (coluna do `Table` do base-ds) |

10 arquivos, 2 layouts diferentes: página de detalhe (texto solto, `<p>`/`<dd>`) e
célula de tabela (compacta, precisa do botão sem quebrar a altura da linha).

**Fora de escopo, com motivo:**
- `ProfileContent.tsx` (admin e employee, `/dashboard/*/profile`) — mostra o
  próprio nome/e-mail de quem está logado, não de cliente/funcionário sendo
  atendido; caso de uso mais fraco (copiar o próprio e-mail é raro). Deixo de fora,
  mas é trivial estender se o usuário quiser depois.
- `AuditLogsContent.tsx` (coluna "Ator") e `StockMovementHistoryContent.tsx`
  (coluna "Quem") — `actorEmail` é de quem *executou* a ação (funcionário/admin),
  aparece só como rastro de auditoria, não como registro principal da tela.
- `SolicitacoesContent.tsx` (`requestedByEmail`/`resolvedByEmail`) — mesma
  categoria: e-mail de quem operou a solicitação, não de cliente.
- `ProductReviewsModerationContent.tsx` (`review.userName`) — nome de quem avaliou,
  sem e-mail/telefone ao lado; não há claro motivo operacional pra copiar.
- Endereço do cliente (rua/CEP/cidade em `CustomerDetailContent.tsx`) — não foi
  pedido (só nome/e-mail/telefone), mas é candidato natural pra estender depois.
- `SiteContent.tsx` (telefone/e-mail de contato da loja) — são campos de formulário
  editáveis (`Input` dentro de `ContactForm`), não exibição — não se aplica botão de
  copiar num campo que já é selecionável/editável.

**Risco técnico a verificar na implementação**: `navigator.clipboard.writeText`
exige *secure context* (HTTPS ou `localhost`), igual o `crypto.randomUUID` que já
quebrou uma vez neste projeto ao acessar via IP de rede em HTTP puro (issue
[indianous/base-ds#17](https://github.com/indianous/base-ds/issues/17), ver
[[dev_environment_quirks]]). O `CopyButton` precisa checar
`navigator.clipboard?.writeText` antes de chamar e cair num fallback (`textarea`
temporário + `document.execCommand('copy')`, ou pelo menos um toast de erro
explicando que não deu pra copiar) em vez de estourar exceção não tratada.

## 2. Testes a incluir/alterar

- **`components/ui/__tests__/CopyButton.test.tsx`** (novo, componente isolado):
  clicar chama `navigator.clipboard.writeText` com o `value` recebido; mostra toast
  de sucesso ("Copiado!"); com `navigator.clipboard` indisponível (mock removendo o
  objeto), usa o fallback em vez de quebrar; `aria-label` reflete o `label` recebido
  (ex. "Copiar e-mail").
- Em cada um dos 10 arquivos: teste novo (ou extensão do existente) garantindo que o
  botão de copiar aparece ao lado do dado certo — `getByRole('button', {name: /copiar
  e-mail/i})` etc. Nas tabelas, checar que o botão não quebra a asserção de conteúdo
  da célula já existente (`getByRole('cell', {name: ...})`/`getByRole('row')`).

## 3. O que entra no projeto

**`components/ui/CopyButton.tsx`** (novo): `Button iconOnly` com `Icon="Copy"`,
props `value: string` e `label: string` (vira `aria-label`, ex. `` `Copiar ${label}`
``). Ao clicar: tenta `navigator.clipboard.writeText(value)`; sucesso troca o ícone
pra `Check` por ~1.5s e mostra toast `useToast` de sucesso; indisponível/erro cai no
fallback de `textarea`+`execCommand('copy')` e só then mostra toast de erro se
mesmo assim falhar.

**Páginas de detalhe** (`CustomerDetailContent`, `EmployeeDetailContent`,
`EmployeeFuncionarioDetailContent`, `OrderDetailContent`, `PaymentConfirmContent`):
envolve o texto existente (`<Heading>`/`<p>`/`<dd>`) num `<span className="inline-flex
items-center gap-2">{valor}<CopyButton value={valor} label="nome"/></span>`, sem
mudar o texto em si.

**Tabelas** (`CustomersContent`, `OrdersContent`, `ShippingContent`,
`PaymentsContent` — `<table>` nativa; `EmployeeManagementTable` — `Table` do
base-ds): célula de nome/e-mail ganha o mesmo wrapper inline-flex; nas 4 telas com
`<table>` nativa isso é direto no JSX da `<td>`, no `EmployeeManagementTable` entra
como `render` na coluna (ela hoje não tem `render`, só `key`/`header`, renderiza o
valor cru).

Como as 4 telas com `<table>` nativa também estão no escopo do plano #32
(padronizar pro `Table` do base-ds), faz mais sentido implementar #32 primeiro e
usar `render` em todas — evita escrever o wrapper inline-flex duas vezes (uma na
`<table>` nativa, outra de novo depois de migrar pro `Table`).
