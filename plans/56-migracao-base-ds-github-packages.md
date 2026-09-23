# 56 — Instalar o base-ds pelo GitHub Packages (fim do `file:` link)

## Contexto

Desde a v0.3.0 ([indianous/base-ds#40](https://github.com/indianous/base-ds/issues/40)),
o base-ds é publicado como `@indianous/base-ds` no registry npm do GitHub
Packages, com versões e CHANGELOG. O ecommerce ainda instala pelo diretório
(`"base-ds": "file:../../../node/base-ds"`), o que o README do base-ds proíbe
agora explicitamente:

> Não instale pelo diretório (`file:../base-ds`). Isso cria um symlink para este
> repositório, e o código do base-ds passa a carregar o React de
> `base-ds/node_modules` em vez do React do app. Com duas instâncias de React
> carregadas, qualquer componente com hooks quebra com `Invalid hook call`
> ([#38](https://github.com/indianous/base-ds/issues/38)).

Hoje o app funciona por acaso: ele pega o que estiver compilado no `dist/` do
repositório local (hoje, v0.4.0, gerado em 23/09 às 10:57), sem versão fixa.
Qualquer `npm run build` no base-ds muda o app sem aviso.

Verificado em 23/09:
- O registry responde `@indianous/base-ds`: versões `0.3.0` e `0.4.0` (`latest`).
- O token do `gh` (`gh auth token`, escopos incluem `read:packages`) consegue
  ler o registry. Testado com um `.npmrc` temporário fora do projeto e sem
  gravar o token em arquivo. Serve como alternativa ao token clássico que o
  README pede.
- O frontend é um repositório próprio (`indianous/ecommerce-frontend`, com
  remote), mas **não tem `.github/workflows/`**. O `frontend-ci.yml` existente
  está no repositório raiz, que não tem remote e ignora `/frontend/` no
  `.gitignore`, então nunca roda. Se rodasse, quebraria no `npm ci`, porque o
  `file:` aponta para fora do checkout.

## 1. Problemas encontrados

| # | Arquivo | Linha | Diagnóstico |
|---|---------|-------|-------------|
| 1 | `frontend/package.json` | 16 | `"base-ds": "file:../../../node/base-ds"`: symlink para o repositório de desenvolvimento, sem versão fixa, com risco de duas instâncias de React (#38). |
| 2 | `frontend/package-lock.json` | 11, 39, 4430 | Lock aponta para o diretório (`"resolved": "../../../node/base-ds"`); build não reprodutível em outra máquina. |
| 3 | `frontend/.npmrc` | — | Não existe. Sem ele, `npm install` não sabe que `@indianous/*` vem de `https://npm.pkg.github.com`. |
| 4 | Ambiente local | — | `GITHUB_PACKAGES_TOKEN` não está definido no shell (nem `~/.npmrc`). |
| 5 | `frontend/next.config.ts` | 9–21 | `turbopack.root` alargado para `../../..` só para o Turbopack enxergar o base-ds fora do projeto, e o comentário cita um symlink manual de `react`/`react-dom` dentro de `base-ds/node_modules`. Com o pacote dentro de `node_modules`, os dois deixam de ser necessários. O `root` alargado também faz o Turbopack vigiar `~/dev` inteiro. |
| 6 | `frontend/app/globals.css` | 2, 12–58 | Importa `base-ds/styles` (tokens para Tailwind v3) e redeclara à mão, num `@theme inline`, cada token para o Tailwind v4 gerar os utilitários. Desde a [#37](https://github.com/indianous/base-ds/issues/37) o base-ds exporta `base-ds/styles/v4` com esse `@theme` pronto. A lista manual fica defasada a cada token novo. |
| 7 | `frontend/app/globals.css` | ~75–84 | Workaround global `[role='tooltip'] { white-space: normal; max-width: 12rem }`. Resolvido no próprio base-ds na [#27](https://github.com/indianous/base-ds/issues/27) com o mesmo comportamento, então hoje é código morto. |
| 8 | `../.github/workflows/frontend-ci.yml` (repositório raiz) | 26–28 | CI do frontend no repositório errado: o raiz não tem remote e ignora `/frontend/`, então o workflow nunca roda. Além disso, `npm ci` sem registry nem token falharia com 401 no `@indianous/base-ds`. |
| 9 | `.claude/CLAUDE.md` | 96–101 | Seção do base-ds não diz como ele é instalado nem como atualizar. O README do base-ds traz um trecho pronto para o `CLAUDE.md` dos apps. |

Fora do escopo:
- Dependabot ([base-ds#44](https://github.com/indianous/base-ds/issues/44)): depende
  do CI existir no `ecommerce-frontend` (item 3.6); fica para um plano próprio
  depois deste.
- Ajustes visuais e de acessibilidade da v0.4.0: o app já roda a 0.4.0 pelo
  symlink, então nada muda visualmente nesta migração. O `aria-label` do
  carrinho está no plano #55.

## 2. Testes a incluir/alterar

É uma mudança de infraestrutura, então a verificação principal é a suíte
existente rodando contra o pacote instalado do registry. Entram dois testes
de guarda.

### `__tests__/base-ds-dependency.test.ts` (novo)
- lê `package.json` e espera que `dependencies['base-ds']` comece com
  `npm:@indianous/base-ds@`. Falha se alguém voltar para `file:`, que é o
  que o README do base-ds proíbe.
- lê `package-lock.json` e espera que `packages['node_modules/base-ds'].resolved`
  comece com `https://npm.pkg.github.com/`.

### `__tests__/base-ds-single-react.test.tsx` (novo)
- `require.resolve('react', { paths: [require.resolve('base-ds')] })` é
  igual a `require.resolve('react')`: o base-ds resolve o mesmo React do app
  (sintoma da #38).
- renderiza um componente do base-ds com hooks (`Dialog` aberto) sem
  `Invalid hook call`.

### Suíte existente (sem alteração)
- `npm run typecheck`, `npm test` e `npm run build` devem passar sem mudança
  de código. Os tipos e os componentes da 0.4.0 publicada são os mesmos do
  `dist/` que o app já usa.

## 3. O que entra no projeto

### 3.1 Token (feito pelo usuário, fora do repositório)
Duas opções:
- **A (recomendada, sem criar token novo):** adicionar ao `~/.bashrc`
  `export GITHUB_PACKAGES_TOKEN=$(gh auth token)`. Reaproveita o login do
  `gh`, que já tem `read:packages` e já foi testado contra o registry.
- **B (o que o README do base-ds sugere):** criar um token clássico com o
  escopo `read:packages` e exportá-lo como `GITHUB_PACKAGES_TOKEN`.

O token nunca entra no repositório.

### 3.2 `.npmrc` — `frontend/.npmrc` (commitado, sem segredo)
```ini
@indianous:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
```

### 3.3 Dependência
- `npm install base-ds@npm:@indianous/base-ds@^0.4.0`. O `package.json` fica
  com `"base-ds": "npm:@indianous/base-ds@^0.4.0"` e o lock com o tarball do
  registry. Os imports `from 'base-ds'` e `'base-ds/styles'` não mudam.
- Conferir que `node_modules/base-ds` é um diretório (não um symlink) e que
  `node_modules/base-ds/node_modules/react` não existe.

### 3.4 `next.config.ts`
- Remover o bloco `turbopack` (root alargado + comentário do symlink de React).
  Manter `allowedDevOrigins`.

### 3.5 `app/globals.css`
- Trocar `@import "base-ds/styles";` por `@import "base-ds/styles/v4";`.
- Remover do `@theme inline` local todas as redeclarações de tokens do
  base-ds (cores, raios etc.). Manter só o override das fontes da marca
  (`--font-sans: var(--font-geist-sans)`, `--font-mono: var(--font-geist-mono)`),
  declarado **depois** do import para prevalecer sobre o `@theme` do base-ds.
- Manter `@source "../node_modules/base-ds/dist";`. O `theme-v4.css` do
  base-ds não declara `@source`, e o Tailwind v4 não varre `node_modules`.
- Remover o workaround `[role='tooltip']` (resolvido na #27).
- Atualizar os comentários para refletir o novo estado.

### 3.6 CI — mover para `frontend/.github/workflows/ci.yml`
- Levar o `frontend-ci.yml` do repositório raiz para o `ecommerce-frontend`,
  sem `working-directory: frontend` e sem o filtro `paths: ['frontend/**']`
  (o repositório inteiro é o frontend).
- `actions/setup-node` com `registry-url: https://npm.pkg.github.com` e
  `scope: '@indianous'`.
- No passo `npm ci`: `env: GITHUB_PACKAGES_TOKEN: ${{ secrets.GH_PACKAGES_TOKEN }}`.
  O segredo tem `read:packages` e é criado pelo usuário no `ecommerce-frontend`.
  O `GITHUB_TOKEN` padrão só lê pacotes de outro repositório se o pacote
  der acesso a este repositório.
- Remover o `frontend-ci.yml` do repositório raiz.
- Conferir o primeiro run com `gh run watch` depois do push.

### 3.7 Documentação
- `.claude/CLAUDE.md`: colar na seção "UI — `base-ds` é obrigatório" o trecho
  "Design system (base-ds)" do README do base-ds (instalação por alias, nunca
  `file:`, conferir `dist/index.d.ts`, `npm outdated base-ds` no início de
  tarefa de UI e leitura do CHANGELOG ao atualizar).
- `README.md` (raiz): na seção de setup do frontend, incluir o passo do
  `GITHUB_PACKAGES_TOKEN` antes do `npm install`.
- Atualizar a tabela de stack do `CLAUDE.md` (`base-ds` → `@indianous/base-ds`
  via GitHub Packages).

### 3.8 Ambiente
- Parar o `npm run dev` que está rodando (ele usa o symlink), reinstalar,
  apagar `.next/` (o cache do Turbopack guarda caminhos do root antigo) e subir
  a aplicação completa para a verificação visual.

### Efeito visual esperado (para a verificação manual)
Nenhum. O app já roda a 0.4.0 pelo symlink. Se algo mudar de cor, de
tipografia ou de espaçamento, a troca de `@theme` manual por `styles/v4`
deixou algum token de fora. Nesse caso, abrir issue no base-ds em vez de
redeclarar o token no app. Conferir em especial:
- a fonte (continua Geist);
- os tooltips com label longo (continuam quebrando linha);
- os badges de status.
