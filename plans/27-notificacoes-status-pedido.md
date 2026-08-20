# Notificações de mudança de status do pedido: in-app + e-mail (frontend)

## Contexto

Par do plano de backend [[27-notificacoes-status-pedido]]. O lado de
e-mail é 100% backend (o frontend não participa do envio) — este plano
cobre só a central de notificações **in-app**: sininho no navbar com
contador de não lidas, painel com a lista, marcar como lida.

Padrão visual a seguir: `components/cart/CartDrawer.tsx`, que já resolve
exatamente essa forma (`IconButton` com `Badge` de contador sobreposto +
`Drawer` com a lista) — `NotificationBell.tsx` espelha essa estrutura, não
inventa um padrão novo.

## 1. Problemas encontrados

- Não existe `components/layout/NotificationBell.tsx` nem
  `stores/notifications.store.ts`.
- `components/layout/AppShell.tsx:59` (`actions={[<CartDrawer
  key="cart" />, <UserMenu key="user" />]}`) não tem espaço pro sino de
  notificações.
- Não existe nenhum mecanismo de polling no projeto hoje — toda busca de
  dado é sob demanda (no mount ou em resposta a uma ação), nada roda em
  intervalo.

## 2. Testes a incluir/alterar

- `stores/__tests__/notifications.store.test.ts` (novo): `fetchUnreadCount`
  atualiza o contador; `markAsRead`/`markAllAsRead` atualizam o estado
  local otimisticamente e chamam o endpoint certo; com fake timers, o
  polling chama `fetchUnreadCount` a cada 60s enquanto autenticado e para
  de chamar depois do logout.
- `components/layout/__tests__/NotificationBell.test.tsx` (novo):
  - usuário anônimo: componente não renderiza nada (`null`) — mesmo
    padrão de "não faz sentido pra quem não está logado" que outras partes
    do dashboard já seguem;
  - com notificações não lidas, mostra o `Badge` com a contagem;
  - clique abre o `Drawer` com a lista (título, mensagem, indicador de não
    lida, hora relativa);
  - clicar numa notificação chama `PATCH /api/notifications/{id}/read` e
    navega pro `linkUrl` se houver;
  - "Marcar todas como lidas" chama `PATCH /api/notifications/read-all` e
    zera o contador;
  - lista vazia mostra "Nenhuma notificação por enquanto." em vez de painel
    vazio silencioso.

## 3. O que entra no projeto

### BFF — novo `app/api/notifications/route.ts`,
`app/api/notifications/unread-count/route.ts`,
`app/api/notifications/[id]/read/route.ts`,
`app/api/notifications/read-all/route.ts`

Proxy 1:1 pros 4 endpoints novos do backend, mesmo padrão de repasse de
`Authorization` do resto do BFF.

### Tipos — `types/index.ts`

```ts
export type NotificationType = 'ORDER_STATUS_CHANGED'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  linkUrl: string | null
  readAt: string | null
  createdAt: string
}
```

### `stores/notifications.store.ts` (novo)

- Estado: `unreadCount: number`, `items: AppNotification[]`.
- Ações: `fetchUnreadCount()`, `fetchList()`, `markAsRead(id)`
  (otimista: atualiza local antes da resposta, reverte se falhar),
  `markAllAsRead()` (idem).
- Sem `persist` — ao contrário do carrinho, notificação é sempre buscada
  fresca do servidor, não faz sentido cachear em `localStorage`.

### `lib/useNotificationPolling.ts` (novo hook, ou direto dentro do
`NotificationBell`)

- `useEffect` com `setInterval(fetchUnreadCount, 60_000)` enquanto
  `isAuthenticated`; limpa o intervalo no unmount/logout. 60s é o ponto de
  partida — ajustar depois se ficar muito/pouco agressivo não é uma
  mudança estrutural.

### `components/layout/NotificationBell.tsx` (novo)

- Mesma estrutura de `CartDrawer.tsx`: `IconButton` (`icon="Bell"`) +
  `Badge` com `unreadCount` sobreposto (só aparece se `> 0`) + `Drawer`
  que lista as notificações (`NotificationListItem`, mesmo papel que
  `CartCardItem` cumpre pro carrinho).
- Retorna `null` se não autenticado (não faz chamada nenhuma nesse caso).

### `components/layout/AppShell.tsx`

- `actions={[<NotificationBell key="notifications" />, <CartDrawer
  key="cart" />, <UserMenu key="user" />]}`.

### Fora de escopo

- Não constrói central de notificações como página própria (só o painel
  no `Drawer` do navbar) — não foi pedido.
- Não adiciona preferências de canal no perfil do cliente (ver plano de
  backend — todo mundo recebe os dois canais sempre, por enquanto).
