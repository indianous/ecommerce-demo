# 29 — Substituir `components/ui/IconButton` pelo `Button` do base-ds

## Contexto

O `base-ds` acabou de atualizar o `Button` (`/home/indianous/dev/node/base-ds`, `dist/`
já rebuildado): quando `iconOnly` e `aria-label` estão presentes, ele agora mostra um
tooltip embutido no hover/focus (Escape fecha), com o mesmo visual (`bg-foreground`/
`text-background`, `role="tooltip"`) que `components/ui/IconButton.tsx` recriava à mão
compondo `Button`+`Tooltip`. `IconButton` ficou redundante.

## 1. Problemas encontrados

- `components/ui/IconButton.tsx` reimplementa `iconOnly`+tooltip que o `Button` do
  `base-ds` já cobre nativamente — mantém duas fontes da mesma lógica.
- 54 arquivos consumiam `IconButton` (grep `IconButton` fora de `node_modules`/`.next`),
  passando `icon`/`label` em vez de `leftIcon`/`aria-label` do `Button`.
- Gotcha: `IconButton` tinha `variant` default `'ghost'`; o `Button` do base-ds tem
  default `'primary'`. Todo call site sem `variant` explícito precisa ganhar
  `variant="ghost"` para manter a aparência atual.
- `app/(employee)/dashboard/orders/[id]/OrderDetailContent.tsx` importava
  `type IconName` de `IconButton.tsx` para tipar `ACTION_ICONS: Record<OrderStatus,
  IconName>`. O `base-ds` não reexporta esse tipo no `src/index.ts` (só o componente
  `Icon`), então o arquivo precisa da própria declaração local
  (`ComponentProps<typeof Icon>['name']`).

## 2. Testes a incluir/alterar

Nenhuma asserção deveria mudar: `IconButton` já expunha `aria-label`/`role="tooltip"`
no hover, e o `Button` do base-ds expõe exatamente a mesma superfície de acessibilidade
para os mesmos casos (`iconOnly`+`aria-label`). Testes afetados são regressão pura —
rodar a suíte completa (`npx vitest run`) e corrigir qualquer asserção que dependia de
alguma particularidade de DOM do `IconButton` antigo que não sobreviva à troca.

## 3. O que entra no projeto

- Todo `<IconButton icon="X" label="Y" ...>` vira
  `<Button iconOnly leftIcon={<Icon name="X" size="sm" />} aria-label="Y" ...>`
  (adicionando `variant="ghost"` explícito onde não havia `variant`).
- `components/ui/DuelingPicklist.tsx` migrado do mesmo jeito (era consumidor de
  `IconButton`).
- `OrderDetailContent.tsx` ganha `type IconName = ComponentProps<typeof Icon>['name']`
  local.
- `components/ui/IconButton.tsx` e `components/ui/__tests__/IconButton.test.tsx`
  removidos.
