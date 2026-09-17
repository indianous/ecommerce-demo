# 49 — Desativar emissão de nota fiscal (kill switch de desenvolvimento, sem UI de admin)

Plano irmão: `backend/plans/49-desativar-emissao-de-nota-fiscal.md` (contexto completo e a
nova propriedade `fiscal.invoice.emission-enabled`/`FISCAL_INVOICE_EMISSION_ENABLED` que
bloqueia `POST /admin/orders/{id}/invoice`).

## Contexto

Decisão do usuário: bloquear a emissão de NF-e até ele decidir retomar (motivado pelo
bloqueio externo do plano #42).

**Revisão importante em relação à primeira versão deste plano**: nada de Switch/toggle em
Gestão do Site. Nenhum botão de emitir nota e nenhuma opção de habilitar a feature pode
aparecer em nenhuma tela, pra nenhum papel. O controle é só variável de ambiente, lida em
build/deploy — o frontend não expõe nenhuma forma de ligar/desligar isso em runtime.

## 1. Problemas encontrados

- `components/content/OrderDetailContent.tsx:337` mostra o botão "Emitir NF-e" (dentro do
  bloco `canManageInvoice`, linha 110) sempre que `order.paymentStatus === 'PAID'` e
  `!order.invoice` — incondicionalmente.
- Não existe nenhuma variável `NEXT_PUBLIC_*` de feature flag no projeto hoje
  (`grep NEXT_PUBLIC_` só acha `NEXT_PUBLIC_API_URL` em `lib/api-client.ts:1`) — vai ser a
  primeira.

## 2. Testes a incluir/alterar

- **Teste de página que já cobre `OrderDetailContent`** (localizar o arquivo de teste
  existente da página de detalhe do pedido): novo caso — com
  `process.env.NEXT_PUBLIC_FISCAL_INVOICE_EMISSION_ENABLED` mockado como `'false'`, o bloco
  inteiro de "Nota fiscal" (título + botão) **não renderiza**, mesmo com
  `paymentStatus=PAID` e `canManageInvoice=true`. Testes existentes desse arquivo continuam
  passando sem setar a env var (default = habilitado).

## 3. O que entra no projeto

### Tipos
- Nenhum tipo novo.

### Componentes
- `components/content/OrderDetailContent.tsx`: a condição do bloco de nota fiscal
  (`admin/AdminInvoiceService.java:44`, linha ~332 no frontend, hoje só `canManageInvoice`)
  passa a incluir também
  `process.env.NEXT_PUBLIC_FISCAL_INVOICE_EMISSION_ENABLED !== 'false'` (lido uma vez, fora
  de qualquer estado/effect — é uma env var de build, não runtime). Com a flag desligada, a
  seção some inteira: sem título "Nota fiscal", sem botão, sem badge de status. **Nenhuma
  mensagem explicando que está desativado** — o pedido do usuário é que não apareça nada,
  não que apareça um aviso.

### Configuração
- `.env.example`: adicionar `NEXT_PUBLIC_FISCAL_INVOICE_EMISSION_ENABLED=true` com
  comentário explicando que é lido só no build/boot do Next.js (mudar exige rebuild/restart
  do `next dev`/`next build`), e que só quem tem acesso ao deploy deve alterar.
- `README.md`: linha na tabela de variáveis de ambiente do frontend.

### Páginas
- Nenhuma rota nova, nenhuma mudança em Gestão do Site.

## Ação imediata pedida pelo usuário

Depois de implementado e mergeado: setar `NEXT_PUBLIC_FISCAL_INVOICE_EMISSION_ENABLED=false`
(frontend) e `FISCAL_INVOICE_EMISSION_ENABLED=false` (backend, ver plano irmão) no ambiente e
reiniciar os dois serviços. Pra religar quando o plano #42 for desbloqueado, é o inverso —
sem nenhuma tela envolvida em nenhum dos dois casos.
