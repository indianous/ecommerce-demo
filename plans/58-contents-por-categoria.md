# 58 — Separar os contents em pastas por categoria

## Contexto

`components/content/` tem 36 contents soltos na raiz e mais 19 arquivos em
`site/`, misturando telas da loja, de autenticação e do back-office.
O projeto já tem uma taxonomia para o back-office: os **grupos do menu lateral**
(`components/layout/dashboard-nav-groups.ts`): Vendas, Catálogo, Pessoas,
Site e Sistema. Este plano usa esses mesmos grupos como pastas, para que "onde
fica a tela X" tenha a mesma resposta no menu e no código.

É **só movimentação de arquivos e troca de imports**: nenhum componente muda de
nome, de props ou de comportamento.

Depende do plano #55 estar commitado antes. Os dois mexem nos mesmos ~50
arquivos, e fazer em commits separados mantém o `git log --follow` de cada
content legível (o rename fica num commit sem mudança de conteúdo).

### Estrutura proposta

Nomes de pasta em inglês, como o resto de `components/`
(`forms/`, `layout/`, `catalog/`…). O grupo correspondente do menu fica entre parênteses.

```
components/content/
├── auth/                          Login, Register
├── store/                         telas da loja e da área do cliente
│   ├── CartContent
│   ├── CheckoutContent
│   ├── CustomerOrdersContent
│   ├── CustomerProfileContent
│   └── ReviewsContent
├── dashboard/                     back-office (admin e employee)
│   ├── DashboardContent           início do painel
│   ├── AdminProfileContent
│   ├── EmployeeProfileContent
│   ├── sales/        (Vendas)     EmployeeOrdersContent, OrderDetailContent,
│   │                              PaymentsContent, PaymentConfirmContent,
│   │                              ShippingContent, SolicitacoesContent
│   ├── catalog/      (Catálogo)   ProductsContent, ProductCreateContent,
│   │                              ProductEditContent, ProductReviewsModerationContent,
│   │                              DeletedProductsContent, StockContent,
│   │                              StockMovementHistoryContent, ExpiringLotsContent
│   ├── people/       (Pessoas)    CustomersContent, CustomerDetailContent,
│   │                              EmployeesContent, EmployeeDetailContent,
│   │                              EmployeeFuncionarioDetailContent, AdminsContent
│   ├── site/         (Site)       SiteContent, NavigationContent,
│   │                              DistributionCentersContent + todo o site/ atual
│   │                              (seções, SiteSectionPage, SiteSettingsSection,
│   │                              __tests__, site-test-utils)
│   └── system/       (Sistema)    AnalyticsContent, AuditLogsContent
└── shared/                        NotFoundContent (usado no not-found raiz e no público)
```

Critérios para os casos de fronteira:
- **Estoque, Excluídos e Moderação de avaliações** vão para `catalog/`, porque o
  menu põe Estoque e Excluídos em Catálogo, e a moderação é aberta a partir de
  um produto.
- **Centros de distribuição e Navegação** vão para `site/`, porque são
  configurações da loja feitas pela gestão do site (`MANAGE_SITE`).
- **Perfis de admin e funcionário e o início do painel** ficam na raiz de
  `dashboard/`: não pertencem a nenhum grupo do menu.
- **`ReviewsContent`** (avaliações do cliente) fica em `store/`, e a moderação
  (`ProductReviewsModerationContent`) em `dashboard/catalog/`.

## 1. Problemas encontrados

| # | Arquivo | Diagnóstico |
|---|---------|-------------|
| 1 | `components/content/*.tsx` | 36 contents na raiz, sem agrupamento. Para achar uma tela é preciso saber o nome exato do componente. |
| 2 | `components/content/site/` | Única subpasta, e ainda deixa `SiteContent`, `NavigationContent` e `DistributionCentersContent`, que são da gestão do site, fora dela, na raiz. |
| 3 | `.claude/CLAUDE.md` (mapa "Frontend — componentes e estado") | Não lista `components/content/`, onde fica o conteúdo de quase toda página. |

Impacto medido: **90 arquivos** importam de `@/components/content/…`: as
`page.tsx`, os testes de página em `app/**/__tests__` e alguns contents entre
si. Os imports relativos dentro de `site/` (`./SiteSettingsSection`, etc.)
continuam válidos, porque a pasta inteira muda de lugar junta.

## 2. Testes a incluir/alterar

### `__tests__/content-structure.test.ts` (novo — guarda estática)
- nenhum `.tsx` diretamente na raiz de `components/content/`: todo content
  está numa categoria.
- as pastas de primeiro nível são exatamente `auth`, `store`, `dashboard` e `shared`.
- as subpastas de `dashboard/` são exatamente `sales`, `catalog`, `people`,
  `site` e `system`. Categoria nova passa a ser uma decisão explícita, com
  este teste e o `CLAUDE.md` atualizados juntos.

### Testes existentes (só imports)
- os testes que importam contents (`app/**/__tests__`, `components/content/site/__tests__`)
  trocam o caminho do import. Nenhuma asserção muda.
- `__tests__/no-nested-main.test.ts` varre `components/content` recursivamente e
  continua valendo sem alteração.
- `__tests__/content-container-width.test.ts`: hoje isenta, por nome de
  arquivo, os contents de loja/auth/compartilhados do "sem `width`". Com as
  pastas, a regra passa a ser "todo `Container` em `components/content/dashboard/**`
  fica sem `width`", e a lista de isenções sai (é o TODO no próprio teste).

### Critério
- `npm run typecheck`, `npx vitest run` e `npm run build` limpos, com o mesmo
  número de testes de antes, mais os do guarda novo.

## 3. O que entra no projeto

### 3.1 Mover (`git mv`, para o git registrar como rename)
Conforme a árvore acima. `components/content/site/` vai inteira para
`components/content/dashboard/site/`, com seus `__tests__`.

### 3.2 Imports
- Trocar `@/components/content/<Nome>` pelo caminho novo nos 90 arquivos, com um
  script que usa a tabela nome → pasta da árvore acima. Ele falha se sobrar
  algum import para caminho inexistente, e o typecheck confirma.
- Nenhum barrel (`index.ts`): o projeto importa cada componente pelo caminho
  completo, e continua assim.

### 3.3 Documentação
- `.claude/CLAUDE.md`: incluir `content/` no mapa de componentes com a árvore
  de categorias e a regra "content novo vai na pasta do grupo do menu; tela sem
  grupo fica na raiz de `dashboard/`".
- As menções a `components/content` já existentes (Layout de página, guardas)
  continuam corretas, porque se referem à pasta inteira.

### Efeito visual esperado
Nenhum. É só reorganização de arquivos.
