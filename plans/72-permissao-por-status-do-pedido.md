# 72 — Toda mudança de status do pedido exige a permissão certa — frontend

Resolve, junto com o backend, a issue **#15** do `ecommerce-backend`. Plano irmão:
`backend/plans/72-permissao-por-status-do-pedido.md`. O backend passa a exigir uma permissão para **todo**
status de destino (RETURNED passa a exigir `MANAGE_SHIPPING`). Este lado só esconde os botões de status que a
pessoa não pode usar. Os testes daqui usam MSW e podem ser escritos antes.

## Contexto

No detalhe do pedido (`OrderDetailContent`), os botões de próximo status ("Confirmar", "Cancelar", "Enviar",
"Entregar", "Devolver") aparecem para qualquer pessoa que abre a tela. A tela abre para quem tem
`MANAGE_ORDERS`, `MANAGE_SHIPPING` ou `MANAGE_ORDER_STATUS_REQUESTS`. O backend já recusava parte desses
cliques (quem tem só `MANAGE_ORDERS` recebe 403 ao confirmar) e, com o plano, recusa todos os que não batem com
a permissão.

### Decisões

| Ponto | Decisão |
| --- | --- |
| Quais botões aparecem | Só os próximos status cuja permissão a pessoa tem, pela mesma tabela do backend: SHIPPED, DELIVERED e RETURNED exigem `MANAGE_SHIPPING`; CONFIRMED, CANCELLED e PENDING exigem `MANAGE_ORDER_STATUS_REQUESTS`. Admin vê todos |
| Nenhum botão disponível | A área dos botões some, como já acontece nos status terminais |
| "Solicitar retrocesso" | Não muda: é a solicitação (`MANAGE_ORDERS`), aprovada depois por quem tem `MANAGE_ORDER_STATUS_REQUESTS` |
| Recusa do backend | O toast mostra a mensagem do backend, se houver, como no plano 71 |

## 1. Problemas encontrados

| Arquivo | Linha | Diagnóstico |
| --- | --- | --- |
| `components/content/dashboard/sales/OrderDetailContent.tsx` | 397–403 | Renderiza todos os `nextStates`, sem olhar a permissão de quem está logado |
| `lib/permissions.ts` | — | Não há a tabela "status de destino → permissão" do backend |

## 2. Testes a incluir/alterar

### `lib/__tests__/permissions.test.ts` (alterar)

1. `requiredPermissionForStatus`: SHIPPED, DELIVERED e RETURNED → `MANAGE_SHIPPING`; CONFIRMED, CANCELLED e
   PENDING → `MANAGE_ORDER_STATUS_REQUESTS`. Todo `OrderStatus` tem regra.
2. `canChangeOrderStatus(actor, status)`: admin → sempre true; funcionário → só com a permissão do status.

### `app/(employee)/__tests__/employee.pedido.detalhe.page.test.tsx` (alterar)

1. Pedido SHIPPED, funcionário com `MANAGE_ORDERS` e `MANAGE_ORDER_STATUS_REQUESTS` (sem shipping) → sem
   "Entregar" e sem "Devolver".
2. Pedido SHIPPED, funcionário com `MANAGE_SHIPPING` → "Entregar" e "Devolver" aparecem.
3. Pedido PENDING, funcionário só com `MANAGE_ORDERS` → sem "Confirmar" e sem "Cancelar", mas com
   "Solicitar retrocesso".
4. Os testes atuais que clicam em "Confirmar" passam a logar com `MANAGE_ORDER_STATUS_REQUESTS`. Hoje eles usam
   só `MANAGE_ORDERS`, que o backend já recusaria.

## 3. O que entra no projeto

- `lib/permissions.ts`: `requiredPermissionForStatus(status)` e `canChangeOrderStatus(actor, status)`.
- `OrderDetailContent.tsx`: `nextStates` filtrado por `canChangeOrderStatus(user, s)` antes de renderizar os
  botões. No erro do PATCH, o toast usa o `message` do backend.

## O que o usuário verifica

1. Logado como funcionário só com `MANAGE_ORDERS`, abrir um pedido: sem botões de status, com "Solicitar
   retrocesso".
2. Com `MANAGE_SHIPPING`, num pedido enviado: "Entregar" e "Devolver" aparecem e funcionam.
3. Com `MANAGE_ORDER_STATUS_REQUESTS`, num pedido pendente: "Confirmar" e "Cancelar" aparecem e funcionam.
4. Como admin, todos os botões continuam aparecendo.
