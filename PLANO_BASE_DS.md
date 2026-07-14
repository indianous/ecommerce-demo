# Plano: Adoção do base-ds no Frontend

> Gerado a partir de uma auditoria do estado real do projeto em 2026-07-13. Não é um plano de greenfield — é um plano de retrofit + conclusão de páginas stub.

## Achado crítico: base-ds instalado, 0% adotado

- `frontend/components/{product,forms,checkout,employee}/*.tsx` — os 5 componentes existentes (`ProductCard`, `LoginForm`, `RegisterForm`, `CheckoutForm`, `OrderManagementTable`) usam HTML cru + Tailwind. `grep -r "from 'base-ds'"` no projeto → **0 ocorrências**.
- `app/globals.css` não importa `base-ds/styles` — os tokens de tema (`bg-primary`, `text-destructive` etc., usados internamente pelos componentes do base-ds) não estão carregados.
- `app/layout.tsx` é o boilerplate padrão do `create-next-app`, sem `Navbar`/`Footer`. `app/page.tsx` ainda é a home de exemplo do Next.
- `components/layout/` e `components/ui/` existem mas estão **vazios**.
- Páginas stub (3 linhas, sem implementação): `(auth)/login`, `(auth)/register`, `(customer)/profile`, `(customer)/orders`, `(employee)/products`. `(customer)/cart` também é stub.
- Já existe uma boa base de testes (Vitest + RTL) para os 5 componentes atuais, consultando por `role`/`label` — comportamento acessível, não implementação. Vantagem: dá pra trocar HTML cru por base-ds sem reescrever a maioria dos testes.

Isso muda o enquadramento de "implementar páginas novas" para:

**Fase 0 (wiring do DS) → Fase 1 (retrofit dos componentes existentes, testes atuais como rede de segurança) → Fase 2 (completar páginas stub, TDD completo por ser comportamento novo).**

### Inventário do base-ds (`node_modules/base-ds/src/index.ts`)

- **Atoms**: Avatar, Badge, Button, Checkbox, Icon, Image, Input, QrCode, Radio, Select, Skeleton, Spinner, Switch, Heading, Text
- **Molecules**: Breadcrumb, FileUpload, FormField, NumberInput, Pagination, PasswordInput, PinInput, Rating, SearchField, TagsInput
- **Organisms**: Card, Carousel, Dialog, Drawer, Navbar, Sidebar, Table, **Toast**, **Footer**

> `Toast` e `Footer` foram implementados pelo usuário desde a última auditoria — API revisada abaixo (seção "Toast e Footer").

### ✅ Bloqueio de barrel/build — resolvido

Confirmado em `node/base-ds/src/index.ts` e em `dist/index.d.ts`/`dist/index.js`: `Toast`, `ToastProvider`, `useToast`, `ToastViewport` e `Footer` (+ tipos) estão todos reexportados no barrel e presentes no `dist/` publicado, com o build rodado depois da edição do barrel. `import { Toast, ToastProvider, useToast, ToastViewport, Footer } from 'base-ds'` já funciona no frontend. Sem pendência aqui — pode seguir direto para a Fase 0/1 com esses componentes.

---

## Plano de Execução

### Fase 0 — Wiring (bloqueante)

1. `app/globals.css`: adicionar `@import "base-ds/styles";`
2. `app/layout.tsx`: reescrever envolvendo a árvore com `<ToastProvider>`, renderizar `<Navbar>` + slot de children + `<Footer>` (agora real, base-ds) + `<ToastViewport />` uma única vez (ela usa `createPortal` para `document.body`, então não precisa estar dentro do fluxo visual, só dentro do `ToastProvider`).
3. `app/page.tsx`: substituir boilerplate por home real (pode usar `Carousel` para banners de destaque).

### Fase 1 — Retrofit dos componentes existentes

| Componente atual | Troca para base-ds |
|---|---|
| `ProductCard.tsx` | `Card` + `Image` + `Badge` (categoria/estoque) + `Heading`/`Text` + `Button` |
| `LoginForm.tsx` | `FormField` + `Input` + `PasswordInput` + `Button` |
| `RegisterForm.tsx` | idem + `Checkbox` se houver termos de uso |
| `CheckoutForm.tsx` | `FormField` + `Select` (endereço) + `Radio` (pagamento) + `Button` + **`QrCode`** para exibir o Pix (hoje é só texto — ganho real) |
| `OrderManagementTable.tsx` | `Table` + `Select` (status) + `Badge` (cor por status) |

Regra: rodar a suíte de testes existente a cada troca — comportamento (texto, roles, labels) não pode mudar. É refactor puro, então **não é necessário TDD aqui** (sem comportamento novo), só disciplina de "testes verdes antes e depois".

### Fase 2 — Completar páginas stub (comportamento novo → TDD completo)

- **`(auth)/login`, `(auth)/register`**: montar em torno do `LoginForm`/`RegisterForm` já retrofitados.
- **`(customer)/cart`**: lista de itens em `Table`, `NumberInput` para quantidade, `Button` remover, resumo com `Text`. Componente novo: **`CartDrawer`** (mini-carrinho no header) usando `Drawer` do base-ds — dá pra montar sem criar nada novo na lib.
- **`(customer)/profile`**: `FormField`/`Input` para dados do usuário, lista de endereços.
- **`(customer)/orders`**: lista de pedidos do cliente em `Table` + `Badge` de status + `Pagination`.
- **`(employee)/products`**: CRUD — `Table` + `Dialog` (modal criar/editar) + `FormField`/`Input`/`NumberInput`/`Select` (categoria) + `FileUpload` (imagem) + `Button`.
- **Catálogo**: hoje não usa `Pagination` nem `SearchField` do base-ds mesmo os dados vindo paginados (`ProductPage.totalPages` existe e é ignorado) e a busca é só via querystring sem input visível — adicionar `SearchField` + `Pagination` reais.

### Toast e Footer — API (revisada em `node/base-ds/src/components/organisms/{Toast,Footer}`)

**Toast** — não é um único componente, é um kit: `ToastProvider`, `useToast`, `Toast` (visual), `ToastViewport` (portal).

- `<ToastProvider>` — Context provider, deve envolver a árvore em `app/layout.tsx`.
- `useToast()` — hook, retorna `{ toasts, toast, dismiss }`.
  - `toast({ title?, description?, variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info', duration?, action?: { label, onClick } })` → retorna `id`. `duration` default 5000ms; `duration: 0` desativa auto-dismiss.
  - `dismiss(id)` — fecha manualmente.
- `<ToastViewport />` — renderiza a fila via `createPortal` em `document.body` (`fixed bottom-4 right-4`); precisa estar montado uma vez dentro do `ToastProvider` (colocar em `app/layout.tsx`).
- Acessibilidade já resolvida no componente: `role="alert"` quando `variant="destructive"`, `role="status"` nos demais — dispensa `<p role="alert">` manual.

**Footer** — componente único: `<Footer logo? columns?: {title, links:{label,href}[]}[] socialLinks?: {icon,href,label}[] copyright? />`. Sem colunas/logo, renderiza só a barra de copyright (default `© {ano} base-ds` — passar `copyright` custom).

### Plano de integração

1. **Fase 0**: `app/layout.tsx` ganha `<ToastProvider>` (envolvendo tudo) + `<ToastViewport />` + `<Footer>` real com colunas/copyright do site (substitui o footer temporário do plano anterior).
2. **Fase 1 (retrofit, adicionar à tabela)**: trocar `<p role="alert">` cru por `useToast().toast({ variant: 'destructive', description })` em:
   - `LoginForm.tsx` (erro de credenciais)
   - `CheckoutForm.tsx` (erro de pagamento)
   - `(employee)/dashboard/page.tsx` (erro ao buscar pedidos)
   - Testes existentes que hoje buscam `role="alert"` continuam válidos sem alteração — variant `destructive` do `Toast` já expõe esse role.
3. Ver checklist de bloqueio na seção acima antes de qualquer import — o barrel `src/index.ts` do base-ds precisa reexportar `Toast`/`ToastProvider`/`useToast`/`ToastViewport`/`Footer` e o pacote precisa ser rebuildado.

---

## Padrão de Testes

### Nível 1 — Unit (mantém o padrão já usado no repo)

RTL + Vitest, consultas por `role`/`label`/texto visível, nunca por classe CSS ou estrutura DOM. Já é o que `ProductCard.test.tsx` faz e continua válido depois do retrofit.

### Nível 2 — "DS enforcement" (novo — garante que o DS está sendo injetado de fato)

Os componentes do base-ds não têm `data-slot`/atributo identificador (conferido em `Button.tsx`/`FormField.tsx` — só classes Tailwind + tokens). Uma asserção via DOM tipo "existe `<button>` com role" **não prova** que veio do base-ds, já que HTML cru passaria na mesma query. Duas técnicas:

1. **Regra de lint estática** (mais forte, pega em CI antes de rodar teste): adicionar em `eslint.config.mjs` um `no-restricted-syntax` banindo elementos JSX crus (`button`, `input`, `select`, `table`) dentro de `components/` e `app/`, com mensagem apontando pro equivalente do base-ds.
2. **Teste de contrato do design system** (`components/__tests__/design-system-contract.test.tsx`): importa cada primitivo do base-ds usado no projeto (`Button`, `Input`, `Select`, `FormField`, `Card`, `Navbar`, `Table`, `Dialog`, `Drawer`, `Badge`, `Pagination`, `PasswordInput`, `QrCode`, `Footer`, `Toast`/`ToastProvider`/`ToastViewport`) e faz um render mínimo de cada, checando que não quebra e que expõe o role esperado. Como `base-ds` é `file:../../../node/base-ds` (dependência local, pode mudar sob o seu pé), esse teste funciona como alarme antecipado de breaking change na lib — inclusive do problema de barrel/build descrito acima (o teste falha na importação se `Toast`/`Footer` não estiverem exportados de fato).

### Nível 3 — Integração de página

MSW (já está no `package.json`) para mockar as chamadas a `/api/...` e testar o fluxo completo da página (ex: catálogo carrega produtos → filtra por categoria → pagina), sem tocar em `fetch` real.

---

## Fase 0 — concluída

Wiring feito e testado (TDD): `app/globals.css` importa `base-ds/styles` + mapeia os tokens semânticos para `@theme inline` do Tailwind v4 + `@source` apontando pro `dist` do base-ds; `components/layout/AppShell.tsx` (`ToastProvider` + `Navbar` + `Footer` + `ToastViewport`, 6 testes) plugado em `app/layout.tsx`; `app/page.tsx` reescrita com `Heading`/`Text` do base-ds + link real pro catálogo (2 testes). Suíte completa: 10 arquivos, 51 testes, todos verdes.

No caminho, apareceram 4 bugs reais na integração com o `base-ds` (não eram gap de componente, eram infra/build) — corrigidos, com sua autorização explícita para dois deles:

1. **`package.json` do base-ds com `exports`/`main`/`module` desalinhados do output do `tsup`** — apontava `import` pro inexistente `dist/index.mjs` e `require` pro `dist/index.js` (que na verdade é ESM). Corrigido: `main`/`exports.require` → `dist/index.cjs`, `module`/`exports.import` → `dist/index.js`.
2. **Duas cópias de React** — `base-ds` (`file:../../../node/base-ds`) tem seu próprio `node_modules/react`(-dom) `19.2.7`, diferente do `19.2.4` do frontend, causando "Invalid hook call" em qualquer componente do base-ds que use hooks (ex: ícones do `lucide-react`). Tentei resolver via alias no Vite/Turbopack, mas não pegava em código CJS já empacotado; a correção que funcionou de fato foi trocar `node/base-ds/node_modules/{react,react-dom}` por symlinks pro `node_modules` do frontend. É estado gerado (não versionado), então some se alguém rodar `npm install` dentro de `node/base-ds` de novo — vale considerar workspaces (npm/pnpm) se esse `file:` link for ficar permanente.
3. **`tsup.config.ts` do base-ds sem `platform: 'browser'`** — o `QrCode` usa o pacote `qrcode`, que tem um campo `"browser"` no `package.json` pra trocar o renderer Node (`fs`/`pngjs`) por um baseado em `canvas`; sem `platform: 'browser'` no esbuild/tsup, o build ignorava esse campo e empacotava a versão Node inteira dentro do bundle único do base-ds — quebrava o SSR de **qualquer** página Next.js que importasse qualquer coisa do base-ds. Corrigido no `tsup.config.ts`.
4. **`ToastViewport` acessava `document.body` direto no corpo do componente** (fora de `useEffect`), o que quebra em SSR (`document` não existe no Node). Corrigido com mount-guard (`useState` + `useEffect`, retorna `null` até montar no client) — padrão padrão pra portais em React/Next. Suíte de testes do próprio `base-ds` continua verde (23/23 no `Toast`).
5. **Bundle do base-ds sem diretiva `"use client"` em lugar nenhum.** O `tsup` empacota todos os componentes num único `dist/index.js`/`dist/index.cjs`, sem code splitting. Como nenhum arquivo (fonte ou output) tem `"use client"`, qualquer Server Component do Next que importe **qualquer coisa** do `base-ds` — mesmo um componente puramente apresentacional como `Heading` — puxa o bundle inteiro pro grafo de módulos do servidor, incluindo o `createContext` usado pelo `ToastProvider`. Resultado: erro do compilador de RSC do Next ("You're importing a module that depends on `createContext` into a React Server Component module") em qualquer página que usasse `base-ds` diretamente (ex.: `app/page.tsx` importando `Heading`/`Text`).
   - Tentei marcar `src/index.ts` com `'use client'` → o esbuild descarta diretiva de nível de módulo em bundle single-file ("Module level directives cause errors when bundled").
   - Tentei a opção `banner` do `tsup` → mesmo resultado, porque o `banner` ainda passa pelo parser/validador de diretivas do esbuild.
   - **Fix que funcionou**: no hook `onSuccess` do `tsup.config.ts`, depois que o esbuild termina, um pós-processamento simples (`fs.readFileSync`/`writeFileSync`) faz o prepend literal de `'use client';\n` em `dist/index.js` e `dist/index.cjs`, fora do pipeline do esbuild. Como praticamente todo componente do base-ds usa hooks/context/refs, marcar o pacote inteiro como client-only é a decisão correta (não é gambiarra pontual).
   - Rebuild confirmado: `dist/index.js` e `dist/index.cjs` agora começam com `'use client'`. Suíte do `base-ds` (`vitest run`): 568/586 passando — as 18 falhas restantes são todas em specs de Storybook (`addon-a11y`/instrumenter), pré-existentes e não relacionadas a essa mudança (só toquei `tsup.config.ts` e um comentário em `src/index.ts`). Suíte do frontend: 51/51 verde. `curl` na home confirma a página renderizando sem o erro de RSC.

Também achado, sem necessidade de fix: `Button` do base-ds não tem `href`/`asChild` — não dá pra renderizar um link com a cara de botão primário só com a lib. Na home usei um `<Link>` do Next estilizado manualmente com os tokens do base-ds (`bg-primary`, `text-primary-foreground`, etc.) em vez de inventar um componente novo. Vale avaliar se o `Button` deveria crescer suporte a link no futuro.

## Próximo passo sugerido

Fase 0 feita. Seguir para Fase 1 (retrofit dos componentes existentes) usando os testes atuais como rede de segurança, e só então Fase 2 (páginas novas).
