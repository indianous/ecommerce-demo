# Múltiplos gateways de pagamento, com troca pelo admin (frontend)

## Contexto

Complementa `backend/plans/gateways-pagamento.md`. O backend passa a ter 3
implementações de `PaymentGateway` (Mock, Stripe, PagSeguro), uma ativa por
vez, escolhida pelo admin/gestor do site via novo endpoint
`GET/PUT /api/v1/site/payment-gateway` (protegido `MANAGE_SITE`).
Credenciais de cada gateway vêm de variável de ambiente no backend — o
frontend só mostra/troca **qual está ativo**, não edita chave nenhuma.
Quando o gateway ativo usa checkout hospedado (Stripe/PagSeguro), a resposta
de `POST /api/v1/orders` passa a incluir `checkoutUrl`; com o Mock, continua
`null`/ausente como hoje.

## 1. Problemas encontrados

- `app/(employee)/dashboard/site/SiteContent.tsx` só tem a seção de
  placeholder de imagem — não existe seção nem padrão de "múltiplas seções"
  reaproveitável nessa página; cada seção nova é adicionada manualmente
  dentro do mesmo `<div className="flex flex-col gap-6">` (linha 63).
  **Atenção**: há trabalho em andamento não commitado na branch atual
  (`feature/aprovacao-manual-pagamentos`) extraindo seções do site em
  componentes de formulário próprios (`components/forms/ContactForm.tsx`,
  `SocialLinksForm.tsx`, `FaviconForm.tsx`, etc., ainda não versionados) —
  a seção de gateway deve seguir esse mesmo padrão de form isolado, e a
  implementação real só deve começar depois que esse trabalho for
  commitado, para evitar conflito.
- `frontend/types/index.ts:116-125` (`OrderResponse`) não tem
  `checkoutUrl`; não existe nenhum tipo `PaymentGatewayProvider`/
  `PaymentGatewayConfig`.
- `app/api/site/settings/*` não tem rota para o novo endpoint de gateway
  (`app/api/site/payment-gateway/route.ts` não existe).
- `components/forms/CheckoutForm.tsx:60-84` — ao concluir o pedido, sempre
  mostra a tela de sucesso local ("Pedido realizado com sucesso!", QR code
  para Pix). Não trata o caso de o gateway ativo devolver `checkoutUrl`
  (Stripe Checkout / PagSeguro) — hoje o cliente nunca seria redirecionado
  para concluir o pagamento no gateway.
- Nota: `CheckoutForm.tsx` já é uma exceção ao padrão "formulários em
  `components/forms/` são puros" do `CLAUDE.md` — hoje ele mesmo faz
  `fetch('/api/orders')` e guarda estado (linhas 27-66). Vou seguir o padrão
  já existente no arquivo (não é escopo deste plano corrigir essa
  divergência).

## 2. Testes a incluir/alterar

**`components/forms/__tests__/PaymentGatewayForm.test.tsx`** (novo — tem
lógica própria de desabilitar opção não configurada, ganha teste dedicado)

- renderiza as 3 opções (`Mock`, `Stripe`, `PagSeguro`) com `Radio`/`Select`
  do `base-ds`, marcando a opção `active` atual.
- opção com `configured: false` aparece desabilitada, com texto explicando
  que faltam credenciais no servidor.
- selecionar uma opção configurada e confirmar chama `onSave` com o
  provider escolhido.
- erro vindo do pai (ex.: "gateway sem credenciais configuradas") é exibido
  via prop `error`.

**`app/(employee)/dashboard/site/__tests__/SiteContent.test.tsx`** (novo —
hoje a página não tem teste próprio, checar antes de criar)

- com `MANAGE_SITE`: seção "Gateway de pagamento" busca
  `GET /api/site/payment-gateway`, mostra o ativo, troca e salva via
  `PUT`, exibe toast de sucesso.
- troca para provider não configurado → toast de erro com a mensagem do
  backend (409), sem atualizar o estado local.
- sem `MANAGE_SITE`: seção não aparece (`PermissionGuard`).

**`app/api/site/payment-gateway/__tests__/route.test.ts`** (novo, mesmo
padrão dos demais testes de rota BFF em `app/api/site/settings/*`)

- `GET`/`PUT` repassam `Authorization` e o `status` da resposta do backend
  sem alteração.

**`components/forms/__tests__/CheckoutForm.test.tsx`** (estender, arquivo
já existe)

- resposta do `POST /api/orders` com `checkoutUrl` preenchido → em vez da
  tela de sucesso padrão, mostra um link/botão "Continuar para pagamento"
  apontando para `checkoutUrl` (sem redirecionar automaticamente, para não
  quebrar o teste com `window.location` e dar ao usuário a chance de ver a
  confirmação do pedido antes).
- resposta sem `checkoutUrl` (Mock ativo) → comportamento atual preservado
  (tela de sucesso com QR code para Pix, sem link de pagamento externo).

## 3. O que entra no projeto

### Tipos

`types/index.ts`:

- `export type PaymentGatewayProvider = 'MOCK' | 'STRIPE' | 'PAGSEGURO'`
- `export interface PaymentGatewayOption { provider: PaymentGatewayProvider; configured: boolean }`
- `export interface PaymentGatewayConfig { active: PaymentGatewayProvider; available: PaymentGatewayOption[] }`
- `OrderResponse` (linha ~116) ganha `checkoutUrl?: string`.

### BFF

- `app/api/site/payment-gateway/route.ts` (novo) — `GET` e `PUT`, proxy
  para `${API}/site/payment-gateway`, repassando `Authorization` igual a
  `app/api/site/settings/metadata/route.ts`.

### Componentes

- `components/forms/PaymentGatewayForm.tsx` (novo, form puro controlado —
  sem `useState`/`fetch` próprios, recebe `config`, `value`, `onChange`,
  `onSave`, `saving`, `error` via props) — lista os providers de
  `config.available` com `Radio` do `base-ds`, desabilitando os com
  `configured: false` e mostrando aviso; botão "Salvar" chama `onSave`.

### Páginas

- `app/(employee)/dashboard/site/SiteContent.tsx` — nova seção "Gateway de
  pagamento" dentro do mesmo container de seções (linha 63), com estado
  próprio (`config`, `saving`, `error`) seguindo o padrão já usado para o
  placeholder de imagem: `useEffect` busca `GET /api/site/payment-gateway`,
  handler de save chama `PUT` com `Authorization: Bearer ${accessToken}`,
  atualiza estado e mostra `useToast`. Continua protegida pelo
  `PermissionGuard(['MANAGE_SITE'])` que já envolve a página inteira.
- `components/forms/CheckoutForm.tsx` — no bloco de sucesso (linha 69-84),
  quando `order.checkoutUrl` existir, renderiza um link/`Button` (`base-ds`)
  "Continuar para pagamento" com `href={order.checkoutUrl}`, mantendo o
  restante da tela (número do pedido) igual; quando ausente, comportamento
  atual (QR code Pix) permanece inalterado.

## Fora de escopo

- Editor de credenciais de gateway na UI (ficam só em variável de ambiente
  no backend, por decisão já tomada).
- Qualquer coleta de dados de cartão no frontend — o checkout de cartão
  acontece inteiramente na página hospedada do gateway (Stripe
  Checkout/PagSeguro), o site nunca vê número de cartão.
