# Demo — backend falso com dados gerados, somente leitura, na Vercel

Este repositório (`indianous/ecommerce-demo`, público) é uma cópia do `indianous/ecommerce-frontend` (privado),
publicada na Vercel como demonstração. Não há backend real: um backend falso, servido pelo próprio Next, responde
nas mesmas rotas de `/api/v1`.

Os dados são **gerados** em duas etapas:

1. `demo/data.config.json` — o usuário define **quantos** registros criar de cada entidade.
2. `node demo/generator/generate.ts` lê essa configuração e escreve `demo/data.json`, o conjunto de dados completo
   e coerente (pedidos de clientes que existem, com produtos que existem…). O backend falso responde consultando
   esse arquivo.

Leituras saem do `data.json` com paginação, filtros e ordenação aplicados. Escritas respondem sucesso e não têm
efeito nenhum: nada de estado em memória nem bloqueio com mensagem de "modo demonstração".

**Regra que vale para tudo abaixo:** nenhum arquivo vindo do original é alterado. O demo só **acrescenta**
arquivos em caminhos próprios (`demo/`, `app/demo-backend/`, `public/demo/`, `DEMO.md`, este plano). Assim a
sincronização manual (`demo/sync.sh` → `git merge upstream/main`) nunca conflita. Configurações que não cabem em
arquivo novo ficam no painel da Vercel e do GitHub, não no código.

## 1. Problemas encontrados

### 1.1 Toda tela depende do backend em `API_INTERNAL_URL`
- `app/api/**/route.ts` (124 rotas, 154 chamadas `fetch(\`${API}/...\`)`) — o BFF lê
  `process.env.API_INTERNAL_URL ?? 'http://localhost:8080/api/v1'`. **Diagnóstico:** é o único ponto de troca
  necessário. Apontar a variável para o backend falso basta; nenhuma rota precisa mudar.
- Server components também chamam o backend direto, sem passar pelo BFF:
  `app/layout.tsx:16,23` (`/site/settings`), `app/(public)/page.tsx:11,15,25` (`/catalog/products/{best-selling,…}`,
  `/site/banners`), `app/(public)/catalog/page.tsx:17,34,44`, `app/(public)/catalog/[slug]/page.tsx:15,30,40,50,60`
  (`/catalog/products/slug/:slug`, `/catalog/products/:id`, `/products/:id/reviews`,
  `/catalog/products/:id/related`), `app/(public)/about-us/page.tsx:5,14` e as demais páginas de texto de
  `(public)/`. **Diagnóstico:** essas rotas ficam fora do levantamento do BFF; o backend falso e o teste de
  cobertura (§2) precisam incluí-las.
- `app/api/notifications/route.ts:13`, `app/api/admin/customers/route.ts:13`,
  `app/api/admin/analytics/{funnel,channels}/route.ts:13` montam a URL numa variável `url` antes do `fetch`.
  **Diagnóstico:** o teste de cobertura não pode depender só do padrão `fetch(\`${API}...\`)`.

### 1.2 Build na Vercel sem backend no ar
- As páginas acima usam `fetch(..., { next: { revalidate: 60 } })` dentro de `try/catch` e são pré-renderizadas no
  `next build`. **Diagnóstico:** se `API_INTERNAL_URL` apontar para algo fora do ar durante o build, o `catch`
  engole o erro e a home, o catálogo e o layout saem **vazios** até o ISR revalidar. Na Vercel, o backend falso
  (rota do próprio app) não existe enquanto o build roda.
- **Solução sem código:** `API_INTERNAL_URL` na Vercel aponta para o **domínio de produção**
  (`https://<projeto>.vercel.app/demo-backend/api/v1`). O build busca os dados no deploy de produção anterior, que
  já tem o backend falso. Só o **primeiro** deploy sai vazio: basta fazer um redeploy logo depois. Em runtime, a
  mesma URL aponta para o próprio deploy promovido. Depois de regerar o `data.json`, o build ainda usa os dados do
  deploy anterior; o ISR atualiza as páginas em até 60 s (ou faça um redeploy).

### 1.3 O formato dos dados vem de `types/index.ts`
- `types/index.ts` (919 linhas) descreve todas as respostas que o frontend consome: `Product`, `ProductPage`,
  `OrderResponse`, `AdminOrderDetailResponse`, `CustomerDetailResponse`, `Employee`, `Coupon`, `Promotion`,
  `AuditLogResponse`, `AppNotification`, `FunnelResponse` etc. As páginas seguem `{ content, page, size,
  totalElements, … }`. **Diagnóstico:** o gerador e o backend falso importam esses tipos (`import type`). Se o
  original mudar um tipo, o `npm run typecheck` do demo quebra no gerador — e esse é o aviso de que é preciso
  regerar os dados.
- Várias respostas são **visões** das mesmas entidades: `CustomerDetailResponse` junta cliente, pedidos,
  avaliações e carrinho; `ProductPage` com `best-selling` depende dos pedidos pagos. **Diagnóstico:** o
  `data.json` guarda entidades normalizadas (com ids de referência) e o backend falso monta as visões na hora,
  em vez de gravar cada resposta pronta.

### 1.4 Rodar o gerador sem mexer no `package.json`
- Não dá para acrescentar `tsx` nem scripts ao `package.json` sem conflitar com o original. **Diagnóstico:** o Node
  22.19 roda `.ts` direto (remoção de tipos ativa por padrão desde o 22.18). Limite: importar outro arquivo `.ts`
  exige a extensão no import, o que o `tsconfig.json` herdado recusa (TS5097, sem `allowImportingTsExtensions`).
  Por isso, o gerador fica num **único módulo** `demo/generator/generate.ts`, que só importa tipos
  (`import type … from '@/types'`, apagado na execução) e módulos do Node. As listas de nomes, ruas, produtos etc.
  ficam em `demo/generator/pt-br.json`, lido com `fs`.

### 1.5 Datas envelhecem
- `GET /catalog/products/best-selling` usa uma janela de 30 dias, e a analytics e a auditoria mostram períodos
  recentes. **Diagnóstico:** com datas fixas, a demo esvaziaria semanas depois do deploy. O `data.json` guarda
  `generatedAt`, e o backend falso **desloca todas as datas** pela diferença entre agora e `generatedAt` ao
  responder. Os dados sempre parecem recentes.

### 1.6 Autenticação — as três contas fixas continuam
- `app/api/auth/login/route.ts:22-31` só cria sessão quando a resposta traz `refreshToken`. Sem ele, cai no fluxo
  de 2FA (`mfaRequired` / `mfaSetupRequired`). **Diagnóstico:** o login falso sempre devolve
  `{ accessToken, refreshToken, tokenType, expiresIn, role }`, sem 2FA.
- `lib/session-cookies.ts` grava o `refreshToken` no cookie `session` e o `role` no cookie `role`. O `proxy.ts`
  só confere se os dois existem. `app/api/auth/refresh/route.ts:16` reenvia o `refreshToken` no corpo.
  **Diagnóstico:** o frontend não decodifica o token, então ele pode ser opaco. O formato
  `demo.<userId>.<aleatório>` permite ao backend falso saber quem está logado.
- **Contas:** `cliente@demo.com` (`CUSTOMER`), `funcionario@demo.com` (`EMPLOYEE`, com todas as permissões) e
  `admin@demo.com` (`ADMIN`), com qualquer senha. O gerador **sempre** cria essas três, além das quantidades da
  configuração. O cliente fixo recebe pedidos, endereços, avaliações, lista de desejos e notificações próprios, para
  as telas da loja não ficarem vazias. Qualquer outro usuário gerado também entra com qualquer senha.
- O cadastro, a verificação de e-mail e o "esqueci minha senha" respondem sucesso sem efeito.

### 1.7 Escritas "sem efeito" e o que elas implicam
- `components/forms/CheckoutForm.tsx:248` e `components/content/store/CustomerOrdersContent.tsx:102` usam
  `order.checkoutUrl` como `href` de "Continuar para pagamento" / "Pagar agora". **Diagnóstico:** o
  `POST /orders` falso devolve um pedido `PENDING` com `checkoutUrl: "/orders"`, para não levar a um gateway.
- Respostas de criação (`POST /admin/products`, `/admin/categories`, `/addresses`…) são usadas pela tela em
  seguida. **Diagnóstico:** devolver o corpo recebido + `id` fictício + `createdAt`, com status 201. `PUT`/`PATCH`
  devolvem o registro do `data.json` mesclado com o corpo recebido. `DELETE` e escritas sem corpo útil devolvem 204.
- **Consequência aceita:** depois de salvar, a tela recarrega com o dado antigo (carrinho, lista de desejos,
  notificações lidas, edição de produto etc.).

### 1.8 Imagens e arquivos
- Produtos, banners, logo e favicon precisam de imagens. As de `../ecommerce/backend/uploads/` **não servem**:
  comprovantes Pix com dados pessoais, banners com arte do Genshin Impact e fotos de figures de fabricantes (com
  direitos, e várias com conteúdo sugestivo). **Diagnóstico:** o gerador **cria as imagens em SVG**. Tema da loja:
  **moda**. Cada produto ganha a silhueta da sua categoria (camiseta, vestido, calça, tênis, bolsa, acessório)
  pintada na cor que está no nome do produto; banners, logo, favicon e placeholder seguem a mesma paleta. Os
  arquivos vão para `public/demo/images/`, com caminhos relativos `/demo/images/...`. A aplicação usa `<img>` comum
  (nenhum `next/image`), então caminho relativo funciona sem configurar `remotePatterns`.
- `app/api/admin/products/export/route.ts` repassa o corpo cru (CSV). **Diagnóstico:** o backend falso monta o CSV
  a partir dos produtos do `data.json`.
- Uploads (`app/api/upload/{image,payment-receipt}`, `site/settings/{logo,favicon,…}`, `admin/products/import`)
  usam `formData()`. **Diagnóstico:** o backend falso não lê o arquivo; devolve a URL de uma imagem que já existe em
  `public/demo/images/`.

### 1.9 Instalação e CI
- `.npmrc` exige `GITHUB_PACKAGES_TOKEN` para instalar o `@indianous/base-ds`. **Diagnóstico:** a Vercel precisa
  dessa variável (token com `read:packages`), e o pacote precisa dar acesso de leitura ao repositório
  `ecommerce-demo` (Package settings → Manage Actions access), senão o `ci.yml` herdado falha no `npm ci`.
- `.github/dependabot.yml` vem do original. **Diagnóstico:** o demo também vai receber PRs semanais. Não dá para
  remover o arquivo sem conflitar com o original: fechar os PRs ou desligar o Dependabot no repositório.

## 2. Testes a incluir

Todos em ambiente Node (`// @vitest-environment node`), dentro de `demo/__tests__/`. Rodam junto com o `npm test`
herdado, sem mexer no `vitest.config.ts`.

### `demo/__tests__/config.test.ts` — validação de `data.config.json`
- configuração válida passa;
- quantidade negativa, fracionária ou não numérica → erro que cita o campo;
- entidade desconhecida → erro (pega erro de digitação no nome);
- dependências: `orders > 0` com `products = 0` → erro; `reviews > 0` sem pedidos entregues → erro;
  `couponRedemptions` maior que o número de pedidos → erro;
- campo omitido usa o padrão documentado.

### `demo/__tests__/generate.test.ts` — o gerador
- cria exatamente a quantidade pedida de cada entidade, **mais** as três contas fixas;
- as três contas fixas existem com os e-mails e perfis do §1.6, e o cliente fixo tem pedidos, endereço e lista de
  desejos;
- mesma `seed` → `data.json` idêntico; `seed` diferente → dados diferentes;
- integridade: todo pedido aponta para cliente e produtos que existem; todo item de pedido tem o preço do produto
  na data; toda avaliação é de um cliente que comprou o produto; toda movimentação de estoque é de produto
  existente e o saldo bate com `stock` do produto; todo registro de auditoria aponta para funcionário ou admin;
- categorias de produto, status de pedido e status de pagamento cobrem todos os valores dos tipos (quando a
  quantidade permite);
- slugs e e-mails únicos; CPFs válidos (dígito verificador) e só de teste; todo e-mail em `@demo.com` ou
  `@example.com`;
- toda imagem citada no `data.json` está entre as imagens geradas (SVG válido, com `viewBox`);
- a imagem de cada produto usa a cor do nome do produto.

### `demo/__tests__/auth.test.ts`
- `POST /auth/login` com cada conta fixa devolve `accessToken`, `refreshToken`, `tokenType`, `expiresIn` e o
  `role` certo, sem `mfaRequired`;
- e-mail que não está no `data.json` → 401 com `{ message: 'Credenciais inválidas' }`;
- `POST /auth/refresh` com `refreshToken` válido devolve sessão do mesmo usuário; inválido → 401;
- extrai o usuário do header `Authorization: Bearer demo.<userId>.<x>`; token ausente ou malformado → anônimo.

### `demo/__tests__/queries.test.ts` — as leituras a partir do `data.json`
Com um `data.json` pequeno montado no próprio teste:
- `GET /catalog/products`: paginação (`page`, `size`, `totalElements`), busca por texto, filtro por categoria,
  ordenações do tipo `ProductSort`; só produtos ativos;
- `GET /catalog/products/slug/:slug` e `/:id`; inexistente → 404;
- `GET /catalog/products/best-selling`: soma dos itens de pedidos pagos nos últimos 30 dias;
- `GET /admin/orders` e `/admin/orders/:id`: filtros de status e a visão de detalhe com histórico e nota fiscal;
- `GET /admin/customers/:id`: visão com pedidos, avaliações e carrinho do cliente;
- `GET /users/me`, `/orders`, `/cart`, `/wishlist`, `/notifications` devolvem só o que é do usuário do token;
- deslocamento de datas (§1.5): com `generatedAt` 10 dias atrás, toda data da resposta anda 10 dias.

### `demo/__tests__/handler.test.ts` — acesso e escritas
- rota autenticada sem token → 401 sem corpo, igual ao filtro do Spring;
- rota do painel com token de cliente → 403; `/admin/admins` com token de funcionário → 403;
- `POST` de criação → 201 com o corpo recebido + `id` + `createdAt`, e um `GET` seguinte continua devolvendo o
  dado antigo (sem efeito);
- `PUT`/`PATCH` → 200 com o registro mesclado com o corpo; `DELETE` → 204;
- `POST /orders` → pedido `PENDING` com `checkoutUrl: '/orders'`;
- upload (`multipart/form-data`) → 200 com URL que começa com `/demo/images/`;
- `GET /admin/products/export` → `text/csv` com `Content-Disposition` e uma linha por produto.

### `demo/__tests__/route.test.ts`
- a rota `app/demo-backend/api/v1/[...path]/route.ts` monta a path a partir de `params` e repassa método, query,
  headers e corpo para o handler (um caso por método exportado).

### `demo/__tests__/coverage.test.ts` — a proteção da sincronização
- varre `app/**/*.{ts,tsx}` (BFF **e** server components) e extrai cada chamada ao backend: `` `${API}/...` `` e
  as URLs montadas em variável (§1.1). Troca interpolações por `:p` e assume `GET` quando não houver `method`;
- para cada `GET`, exige uma consulta registrada no backend falso (teste por rota, para a falha dizer qual falta);
- para cada escrita, exige que o handler responda com 2xx.

Este é o teste que barra um `git merge upstream/main` que trouxe uma tela nova sem resposta falsa.

## 3. O que entra no projeto

### Configuração — `demo/data.config.json` e `demo/data.config.schema.json`
- O arquivo que o usuário preenche. Uma quantidade por entidade, mais `seed` (dados reproduzíveis) e `periodDays`
  (janela de datas dos pedidos). Exemplo inicial:

  ```json
  {
    "$schema": "./data.config.schema.json",
    "seed": 42,
    "periodDays": 90,
    "categories": 6,
    "products": 60,
    "customers": 30,
    "employees": 4,
    "admins": 1,
    "addressesPerCustomer": 2,
    "orders": 150,
    "orderChangeRequests": 8,
    "reviews": 120,
    "wishlistItems": 40,
    "coupons": 5,
    "couponRedemptions": 25,
    "promotions": 3,
    "stockMovements": 200,
    "distributionCenters": 2,
    "banners": 3,
    "navItems": 6,
    "notifications": 30,
    "auditLogs": 150,
    "pageViews": 2000
  }
  ```

- O schema dá autocompletar e validação no editor, com a descrição de cada campo e os mínimos e máximos. As
  configurações únicas do site (nome, contato, políticas, gateway, Pix) não têm quantidade: o gerador as preenche
  com textos padrão de `pt-br.json`.

### Gerador — `demo/generator/`
- `generate.ts` (módulo único, §1.4):
  - `validateConfig(config)` — as regras do `config.test.ts`;
  - `generate(config): DemoData` — gerador pseudoaleatório com `seed`, sem `Math.random`; cria na ordem das
    dependências: categorias → produtos e estoque → usuários fixos e gerados → endereços → pedidos (histórico de
    status, pagamento, nota fiscal) → avaliações → cupons e usos → promoções → solicitações de alteração →
    notificações → auditoria → visualizações de página;
  - execução direta (`node demo/generator/generate.ts [config] [saída]`): lê `demo/data.config.json`, valida e
    escreve `demo/data.json` formatado, com `generatedAt`.
- `pt-br.json` — nomes, sobrenomes, ruas, cidades e UFs, peças, cores (nome + hex) e descrições de produto por
  categoria de moda, textos de avaliação, textos padrão das políticas e do "sobre".
- As imagens SVG (silhuetas por categoria, banners, logo, favicon, placeholder) são montadas dentro do
  `generate.ts`; `generate()` devolve `{ data, images }` e a execução direta grava `images` em `public/demo/images/`.
- `DemoData` (exportado do `generate.ts`) — as entidades normalizadas, tipadas com os tipos de `@/types`.

### Dados — `demo/data.json` e `public/demo/images/`
- `data.json` é **gerado e commitado** (a Vercel não roda o gerador). Ninguém edita à mão: para mudar, altera-se
  a configuração e roda-se o gerador.
- `public/demo/images/{products,banners,site}/` — SVGs gerados junto com o `data.json` (§1.8), também commitados.

### Backend falso — `demo/fake-backend/`
- `types.ts` — `DemoRequest { method, path, query, headers, body }` e `DemoResponse { status, headers, body }`,
  sem depender do Next, para os testes chamarem direto.
- `auth.ts` — login, refresh, logout e `/auth/mfa/*`, emissão e leitura de `demo.<userId>.<aleatório>`.
- `access.ts` — quais prefixos exigem login (`/users`, `/cart`, `/orders`, `/wishlist`, `/notifications`,
  `/reviews/me`, `/addresses`) e quais exigem `EMPLOYEE`/`ADMIN` (`/admin/**`; `/admin/admins` e
  `/admin/audit-logs` só `ADMIN`).
- `queries/` — uma função por grupo de leitura (`catalog.ts`, `orders.ts`, `customers.ts`, `employees.ts`,
  `stock.ts`, `promotions.ts`, `site.ts`, `analytics.ts`, `notifications.ts`, `account.ts`), cada uma registrando
  suas rotas (`'GET /catalog/products/:id'` → função). Paginação, filtros e ordenação em `paging.ts`.
- `dates.ts` — deslocamento de datas (§1.5).
- `writes.ts` — respostas genéricas de escrita (§1.7) e os casos especiais (`POST /orders`, uploads, CSV).
- `handler.ts` — `handle(req, data): DemoResponse`, juntando tudo; o `data.json` entra por import estático, para
  ir no bundle da função na Vercel sem ler o disco.

### Rota — `app/demo-backend/api/v1/[...path]/route.ts`
- Exporta `GET`, `POST`, `PUT`, `PATCH`, `DELETE`. Converte `NextRequest` em `DemoRequest` (corpo JSON, texto ou
  `formData`), chama `handle` e devolve `Response`. Fora do `matcher` do `proxy.ts`, então não pede login do Next.
- Antes de escrever, ler o guia de route handlers e catch-all em `node_modules/next/dist/docs/` (Next 16:
  `params` é `Promise`).

### Sincronização — `demo/sync.sh`
- `git fetch upstream && git merge --no-edit upstream/main`, depois `npm run typecheck && npx vitest run && npm run
  build`. Se o typecheck falhar no gerador (tipo mudou no original), avisa para ajustar e regerar o `data.json`.
  Se tudo passar, mostra o `git push origin main` para o usuário rodar. Não faz o push sozinho.

### Documentação — `DEMO.md`
- O que é a demo, link, as três contas (qualquer senha), aviso de que nada é salvo, limitações (§1.7), como mudar
  as quantidades e regerar o `data.json`, e como sincronizar com o original.
- O `README.md` herdado continua igual. O texto de apresentação para o site externo sai do `DEMO.md`.

### Configuração fora do código
- **Vercel:** importar `indianous/ecommerce-demo`; variáveis `GITHUB_PACKAGES_TOKEN`,
  `API_INTERNAL_URL=https://<projeto>.vercel.app/demo-backend/api/v1`,
  `NEXT_PUBLIC_FISCAL_INVOICE_EMISSION_ENABLED=false`; sem `TRUST_PROXY_HEADERS`. Primeiro deploy + redeploy (§1.2).
- **GitHub:** liberar leitura do pacote `@indianous/base-ds` para o `ecommerce-demo`; decidir o Dependabot (§1.9);
  preencher "Website" do repositório com o link da Vercel.

### Ordem de implementação
1. `config.test.ts` → validação no `generate.ts` + schema.
2. `generate.test.ts` → gerador + `pt-br.json` + SVGs; gerar o primeiro `data.json`.
3. `auth.test.ts`, `queries.test.ts`, `handler.test.ts` → `demo/fake-backend/`.
4. `route.test.ts` → rota do Next.
5. `coverage.test.ts` → completar as consultas que faltarem até passar.
6. `sync.sh`, `DEMO.md`.

### Fechamento
- `npm run typecheck`, `npx vitest run` (os testes herdados também, para garantir que nada do original quebrou) e
  `npm run build`.
- Subir `next dev` com `API_INTERNAL_URL=http://localhost:3000/demo-backend/api/v1` para o usuário conferir as
  telas antes de qualquer commit.

## Ajustes feitos durante a implementação

- **Ambiente dos testes:** `jsdom` (o padrão), não `node`. O `vitest.setup.ts` herdado usa `HTMLCanvasElement` e
  quebra no ambiente `node`.
- **`cartItems`** entrou na configuração (padrão 20), para o carrinho do cliente e a visão de cliente do painel
  não ficarem vazios.
- **Contas fixas no `data.json`** (`fixedAccounts`): o backend falso só importa **tipos** do gerador. O gerador lê
  `pt-br.json` do disco ao carregar e quebraria a função na Vercel. O `route.test.ts` barra import de valor.
- **Deslocamento de datas:** em vez de converter cada filtro, o handler desloca o conjunto inteiro uma vez por
  minuto (cache por instância). Filtros de período, lotes vencendo e analytics funcionam sem conversão, e o corpo
  das escritas não tem as datas deslocadas por engano.
- **`demo/generator/package.json`** com `"type": "module"`, para o Node rodar o gerador sem aviso.
- **Cobertura das escritas:** o teste exige status abaixo de 500 (sem erro), não 2xx. Algumas escritas recusam o
  corpo vazio de propósito (login → 401, cupom → 400).
