# Tracking de origem de tráfego, páginas e produtos visitados (frontend)

## Contexto

Par do plano de backend [[25-tracking-trafego-navegacao]]. Três frentes:
(1) capturar UTM/referrer num cookie no primeiro acesso e mandar no
cadastro; (2) beacon de página visitada em toda navegação; (3) mostrar os
3 conjuntos de dado na tela de detalhe do cliente.

## 1. Problemas encontrados

- Não existe nenhuma captura de UTM/referrer no frontend hoje —
  `app/layout.tsx` (root layout) não lê `searchParams` nem grava cookie
  nenhum.
- Não existe nenhum beacon de page view — nenhum `usePathname()` +
  `fetch` de tracking em `AppShell.tsx` ou no root layout.
- `ProductViewTracker.tsx:11` já bate em `/api/products/{id}/views` a cada
  visualização de produto — só falta o backend (fase de trás) passar a
  logar por usuário; o componente do frontend não precisa mudar.
- `components/forms/RegisterForm.tsx` não manda UTM/referrer no payload de
  cadastro.
- `app/(employee)/dashboard/customers/[id]/CustomerDetailContent.tsx` não
  tem seção de comportamento/navegação.

## 2. Testes a incluir/alterar

- `lib/__tests__/traffic-attribution.test.ts` (novo, pro helper de
  captura/leitura do cookie de UTM): grava `utm_source`/`utm_medium`/
  `utm_campaign`/`referrer`/`landing_page` a partir da URL na primeira
  visita; não sobrescreve um cookie já existente numa visita seguinte (a
  atribuição é "primeiro toque", não "último toque" — decisão a confirmar
  com o usuário, ver nota abaixo); expira depois de N dias.
- `components/forms/__tests__/RegisterForm.test.tsx` — novo caso: submit
  inclui os campos de UTM lidos do cookie, se presentes; sem cookie, manda
  os campos como `undefined`/omitidos, sem quebrar.
- `components/layout/__tests__/PageViewBeacon.test.tsx` (novo componente,
  ver abaixo): dispara `POST /api/tracking/page-views` a cada mudança de
  rota (`usePathname()`), com debounce/guard pra não duplicar em re-render.
- `app/(employee)/__tests__/customers.detail.page.test.tsx` — novo caso:
  mostra origem de tráfego (ou "Origem não identificada" se o cliente se
  cadastrou antes desta fase existir); lista páginas visitadas recentes;
  lista produtos vistos recentemente com nome e data.

## 3. O que entra no projeto

### `lib/traffic-attribution.ts` (novo, client-side)

- `captureOnFirstVisit()`: lê `searchParams` (`utm_source`, `utm_medium`,
  `utm_campaign`), `document.referrer` e `location.pathname`; grava num
  cookie (`document.cookie`, não precisa de lib nova) só se o cookie ainda
  não existir — modelo de atribuição "primeiro toque", pra não perder a
  origem real do cliente se ele voltar depois por um canal diferente antes
  de se cadastrar. **Confirmar esse modelo com o usuário antes de
  implementar** — "último toque" (sempre sobrescreve) é a outra opção
  comum e é uma troca de uma linha se for essa a preferência.
- `readAttribution()`: lê o cookie de volta, usado pelo `RegisterForm`.

Chamado uma vez no root layout (`app/layout.tsx`) ou num client component
pequeno montado nele, mesmo padrão do `AuthHydrator.tsx` existente.

### `components/layout/PageViewBeacon.tsx` (novo)

```tsx
'use client'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export function PageViewBeacon() {
  const pathname = usePathname()
  useEffect(() => {
    fetch('/api/tracking/page-views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => {})
  }, [pathname])
  return null
}
```

Montado uma vez em `app/layout.tsx`, mesmo padrão de "componente invisível
que só dispara efeito" que `ProductViewTracker.tsx` já estabelece.

### BFF — novo `app/api/tracking/page-views/route.ts`

Proxy pra `POST /tracking/page-views`, repassando `Authorization` quando
houver (usuário logado) — sem exigir, mesmo comportamento do backend.

### `components/forms/RegisterForm.tsx`

- No submit, inclui `readAttribution()` no payload (campos opcionais,
  mesmos nomes que o `RegisterRequest` do backend espera).

### Tipos — `types/index.ts`

```ts
export interface TrafficSourceSummary {
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  referrer: string | null
  landingPage: string | null
  capturedAt: string
}

export interface PageViewSummary {
  path: string
  viewedAt: string
}

export interface RecentlyViewedProduct {
  productId: string
  productName: string
  viewedAt: string
}

// em CustomerDetailResponse:
trafficSource: TrafficSourceSummary | null
recentPageViews: PageViewSummary[]
recentlyViewedProducts: RecentlyViewedProduct[]
```

### `CustomerDetailContent.tsx`

- Nova seção "Comportamento e tráfego": origem (`utmSource`/`utmMedium`/
  `utmCampaign` ou "Origem não identificada"), lista de páginas visitadas
  recentes, lista de produtos vistos recentemente (nome + link pro
  produto + data).

### Fora de escopo

- Não bloqueia por cookie consent/LGPD banner — se o projeto não tem um
  mecanismo de consentimento hoje, adicionar tracking de comportamento é
  o gatilho certo pra levantar isso com o usuário antes de ir pra
  produção, mas é uma decisão de produto/jurídica, não algo pra decidir
  sozinho dentro deste plano técnico.
