# 47 — Retirada em centro de distribuição (frontend)

Plano irmão: `backend/plans/47-retirada-em-centro-de-distribuicao.md`
(contexto completo, decisões de design, interação com o plano #43/Melhor
Envio, e os endpoints novos).

## Estado atual

- `SiteContent.tsx` já tem o padrão de "seção com link pra uma tela de
  gestão dedicada" — `components/content/SiteContent.tsx:598-607`, o card
  "Navegação do site" linkando pra `${basePath}/navigation`
  (`NavigationContent.tsx`). O card de "Centros de Distribuição" entra do
  lado desse, mesmo padrão.
- `CheckoutForm.tsx` (`components/forms/CheckoutForm.tsx`) hoje só tem
  `Select` de endereço + `Radio` de forma de pagamento — nenhuma noção de
  método de entrega.
- Nenhuma das 14 páginas de gestão inclui "Centros de Distribuição" — é uma
  15ª tela nova, seguindo o mesmo padrão do plano #40
  (`ManagementPageHeader`/`Body` + `ManagementContentHeader`/`Body`/`Footer`).

## 1. Problemas encontrados

Nenhum — funcionalidade nova.

## 2. Testes a incluir/alterar (agrupados por arquivo)

- **Novo `DistributionCentersContent.test.tsx`** (a 15ª página de gestão,
  mesmo padrão das outras 14): lista os centros cadastrados; formulário de
  criar/editar com nome, telefone, endereço completo; botão excluir (soft
  delete, item some da lista); busca/paginação seguindo o mesmo
  `ManagementContentHeader`/`Footer` das demais.
- **`CheckoutForm.test.tsx`** (casos novos):
  - com pelo menos 1 centro de distribuição ativo, mostra os `Radio`
    "Entrega" / "Retirar em uma loja".
  - escolher "Retirar em uma loja" mostra um `Select` com os centros ativos
    (nome + cidade/UF) e **esconde** a etapa de cotação de frete do plano
    #43 (quando essa etapa já existir implementada).
  - com "Retirar" escolhido, o total exibido não inclui frete.
  - `handleSubmit` manda `deliveryMethod: 'PICKUP'` e `pickupLocationId` (em
    vez de `shippingServiceId`) no `POST /api/orders`.
  - sem nenhum centro de distribuição ativo cadastrado, a opção "Retirar em
    uma loja" nem aparece (só "Entrega", comportamento atual).
- **`OrderDetailContent.test.tsx`**: pedido com `deliveryMethod=PICKUP`
  mostra o nome/endereço do centro escolhido em vez de endereço de
  entrega/transportadora.

## 3. O que entra no projeto

### Tipos (`types/index.ts`)
- Novo `DistributionCenter`: `{ id, name, phone, street, number, complement?, district, city, state, zipCode, active }`.
- `CreateOrderRequest`/equivalente: ganha `deliveryMethod: 'DELIVERY' | 'PICKUP'`
  e `pickupLocationId?`.
- `OrderResponse`/`AdminOrderDetailResponse`: ganham `deliveryMethod` e
  `pickupLocation?: DistributionCenter`.

### BFF
- Novo `app/api/site/distribution-centers/route.ts` (`GET` público, `POST`).
- Novo `app/api/site/distribution-centers/[id]/route.ts` (`PUT`, `DELETE`).

### Componentes
- **Nova `DistributionCentersContent.tsx`** (`components/content/`), 15ª
  página de gestão — CRUD completo (criar/editar via `Dialog`+form, excluir
  via `ConfirmDeleteDialog`), seguindo exatamente o padrão do plano #40.
  Rota: `/dashboard/admin/site/distribution-centers` (e espelho employee,
  se `MANAGE_SITE` também valer pra funcionário — confirmar seguindo o
  mesmo critério já usado pras outras seções de `SiteContent`).
- **`SiteContent.tsx`**: novo card "Centros de Distribuição" (mesmo padrão
  do card "Navegação do site"), linkando pra rota acima.
- **`CheckoutForm.tsx`**: busca os centros ativos (`GET
  /api/site/distribution-centers`) ao montar; se houver algum, mostra
  `Radio` "Entrega"/"Retirar em uma loja" acima da seleção de endereço;
  "Retirar" troca a UI pra um `Select` de centros (nome + cidade) e omite a
  etapa de frete; total recalculado sem frete.
- **`OrderDetailContent.tsx`** (admin) e a página de detalhe de pedido do
  cliente: seção de entrega mostra "Retirada em: {nome do centro} —
  {endereço}" quando `deliveryMethod=PICKUP`, em vez do endereço de entrega/
  dados de transportadora.

### `base-ds`
Nenhum componente novo necessário — `Radio`/`Select`/`Dialog`/`Table`/
`ConfirmDeleteDialog` já cobrem tudo.
