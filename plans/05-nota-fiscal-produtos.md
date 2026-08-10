# Dados fiscais de produto e emissão de NF-e (frontend)

## Contexto

Complementa `backend/plans/05-nota-fiscal-produtos.md`. Duas telas mudam:
formulário de produto (novos campos fiscais) e detalhe do pedido (botão
"Emitir NF-e" + status/link do DANFE); mais uma seção nova em Gestão do
Site para os dados fiscais da empresa emissora.

## 1. Problemas encontrados

- `components/forms/ProductForm.tsx` (campos atuais: `name`, `price`,
  `categoryId`, `imageUrl`) não tem campos fiscais — sem eles, o produto
  nunca fica elegível para emissão de nota (backend bloqueia com 400
  listando o que falta).
- `app/(employee)/dashboard/orders/[id]/OrderDetailContent.tsx:1-60` (e o
  restante do componente) só lida com `status`/`paymentStatus` — não tem
  nenhuma seção de nota fiscal, nem noção de `InvoiceResponse`.
- `types/index.ts` não tem `Invoice`/`InvoiceStatus`/campos fiscais em
  `Product`.
- `app/(employee)/dashboard/site/SiteContent.tsx` (mesmo arquivo que ganha
  a seção de gateway de pagamento em `gateways-pagamento.md`) não tem seção
  para dados fiscais da empresa (CNPJ, razão social, IE, regime
  tributário, endereço).

## 2. Testes a incluir/alterar

**`components/forms/__tests__/ProductForm.test.tsx`** (estender)

- novos campos fiscais (NCM, CFOP, unidade comercial, GTIN/EAN, origem)
  renderizam e propagam via `onFormChange`; nenhum é obrigatório no client
  (a obrigatoriedade só existe no momento de emitir a nota, no backend).
- NCM com formato inválido (não 8 dígitos) mostra erro de validação local
  antes mesmo de submeter (feedback rápido, mesmo padrão de outros campos
  com `@Pattern` no backend).

**`components/forms/__tests__/FiscalCompanyDataForm.test.tsx`** (novo — tem
validação própria de CNPJ, ganha teste dedicado)

- preenche CNPJ, razão social, IE, regime tributário e endereço; CNPJ com
  dígito verificador inválido bloqueia o submit.

**`app/(employee)/dashboard/orders/[id]/__tests__/OrderDetailContent.test.tsx`**
(estender, arquivo deve existir dado o tamanho do componente)

- pedido sem nota emitida, pagamento `PAID` → botão "Emitir NF-e"
  habilitado; clicar chama `POST /api/admin/orders/{id}/invoice` e, em
  sucesso, mostra status "Processando"/"Emitida" e link para o DANFE.
- pedido com pagamento `PENDING` → botão desabilitado com texto explicando
  que a nota só pode ser emitida após o pagamento ser aprovado.
- emissão retorna 400 (produto sem dado fiscal) → toast de erro mostrando
  a lista de produtos/campos faltantes vinda do backend.
- pedido que já tem nota `ISSUED` → botão vira "Ver nota" (link direto
  pro DANFE), sem opção de emitir de novo.

**`app/(employee)/dashboard/site/__tests__/SiteContent.test.tsx`** (mesmo
arquivo estendido em `gateways-pagamento.md`) — nova seção "Dados fiscais
da empresa" segue o mesmo padrão de fetch/save; só visível com
`MANAGE_SITE`.

## 3. O que entra no projeto

### Tipos

`types/index.ts`:

- `Product` — adiciona `ncm?: string`, `cfop?: string`, `commercialUnit?: string`, `gtinEan?: string`, `origin?: MerchandiseOrigin`.
- `export type MerchandiseOrigin = 'NACIONAL' | 'ESTRANGEIRA_IMPORTACAO_DIRETA' | ...` (espelha o enum do backend).
- `export type InvoiceStatus = 'PROCESSING' | 'ISSUED' | 'ERROR' | 'CANCELLED'`
- `export interface Invoice { id: string; orderId: string; status: InvoiceStatus; accessKey?: string; danfeUrl?: string; errorMessage?: string; issuedAt?: string }`
- `AdminOrderDetailResponse` — adiciona `invoice?: Invoice`.
- `export type TaxRegime = 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL'`
- `export interface FiscalCompanyData { cnpj: string; legalName: string; tradeName?: string; stateRegistration?: string; taxRegime: TaxRegime; street: string; number: string; neighborhood: string; city: string; state: string; zipCode: string }`

### BFF

- `app/api/admin/orders/[id]/invoice/route.ts` (novo) — `GET`/`POST`,
  proxy para `${API}/admin/orders/{id}/invoice`, mesmo padrão de
  `app/api/admin/orders/[id]/payment-status/route.ts`.
- `app/api/site/settings/fiscal-company-data/route.ts` (novo) — `PUT`,
  mesmo padrão de `app/api/site/settings/metadata/route.ts`.

### Componentes

- `components/forms/ProductForm.tsx` — nova seção "Dados fiscais"
  (colapsável ou em bloco separado, para não sobrecarregar o formulário
  principal) com os campos NCM, CFOP, unidade comercial, GTIN/EAN
  (`FormField` + `input`) e origem (`Select` com as 9 opções do enum).
- `components/forms/FiscalCompanyDataForm.tsx` (novo, form puro
  controlado — validação própria de CNPJ, ganha teste dedicado) — campos
  de CNPJ, razão social, nome fantasia, IE, regime tributário (`Select`) e
  endereço fiscal (reaproveitando os mesmos campos de
  `components/forms/*Address*` se já existir um padrão de endereço no
  projeto — senão, campos soltos seguindo o padrão dos demais forms).

### Páginas

- `app/(employee)/dashboard/orders/[id]/OrderDetailContent.tsx` — nova
  seção "Nota fiscal": sem nota emitida e pagamento `PAID` → botão "Emitir
  NF-e"; `PROCESSING` → badge "Processando" (poll opcional a cada alguns
  segundos, ou botão manual "Atualizar status"); `ISSUED` → link "Ver
  DANFE" (`invoice.danfeUrl`) e chave de acesso exibida; `ERROR` → mensagem
  de erro + botão para tentar de novo. Protegido por
  `PermissionGuard(['MANAGE_PAYMENTS'])` ao redor só dessa seção (o resto
  da tela continua com a proteção existente).
- `app/(employee)/dashboard/site/SiteContent.tsx` — nova seção "Dados
  fiscais da empresa" com `FiscalCompanyDataForm`, mesmo padrão de
  fetch/save das demais seções, protegida por `MANAGE_SITE`.
