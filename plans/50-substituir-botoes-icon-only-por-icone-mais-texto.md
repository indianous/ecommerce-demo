# 50 — Botões de formulários e de ação das telas: ícone + texto (em vez de só ícone)

## Contexto

Decisão do usuário: os botões dos **formulários** (`components/forms/`) e os **botões de
ação das telas** (`components/content/`, fora de tabelas) não devem ficar só com ícone
dependendo de tooltip no hover pra explicar a ação — passam a mostrar também o texto da
ação, visível, ao lado do ícone.

**Fora do escopo — continuam com `iconOnly`:**

- **Botões dentro de células de `Table`** (colunas `render:` de `TableColumn`), mesmo
  quando estão em `components/content/`.
- Tudo que não é `forms/` nem `content/`: `components/admin/*` (inclusive
  `EmployeeManagementTable`), `components/employee/*`, `components/cart/*` (inclusive o
  `Tooltip` + `sr-only` do `CartDrawer`), `components/product/*`,
  `components/layout/NotificationBell.tsx` e `components/ui/CopyButton.tsx`.

Uma primeira versão deste plano cobria a aplicação inteira (119 ocorrências em 58
arquivos) e chegou a ser implementada, mas foi revertida depois da verificação visual.

## 1. Problemas encontrados

`grep -rn "iconOnly" --include="*.tsx"` (fora `node_modules`/`.next`/`__tests__`), no
estado atual: **119 ocorrências**. Este plano converte **93** delas, em **38 arquivos**:

| Grupo | Ocorrências | Arquivos |
|---|---|---|
| `components/forms/` | 32 | 27 |
| `components/content/`, botões de ação (não-tabela) | 61 | 11 |
| **Total convertido** | **93** | **38** |

Ficam de fora **26**: 13 em células de tabela de `content/` e 13 nos demais diretórios
listados acima. Depois do plano, `iconOnly` cai de 119 para 26.

Todas as ocorrências seguem o mesmo padrão: botão autocontido, sem filhos, com o texto da
ação só em `aria-label` (estático ou dinâmico). O tooltip do hover vem de dentro do
próprio `Button` do base-ds (`iconOnly && aria-label`). O "padrão B" da versão anterior
(`Tooltip` externo + `sr-only`) só existe em `CartDrawer` e `NotificationBell`, fora do
escopo.

### Botões de ação de `components/content/` que entram (61 em 11 arquivos)

Página, cabeçalho, toolbar, rodapé de Dialog, cards e listas que **não** são `Table`:

| Arquivo | Linhas (HEAD) | Qtd | O que são |
|---|---|---|---|
| `OrderDetailContent.tsx` | 317, 323, 337, 354, 364, 372, 383, 408, 409, 415, 445, 446 | 12 | comprar etiqueta / ver etiqueta / emitir NF-e / ver nota / atualizar status / tentar novamente / ações de transição de status / confirmar e cancelar mudança / solicitar retrocesso / enviar e cancelar solicitação |
| `SiteContent.tsx` | 424, 439, 454, 469, 482, 497, 510, 523, 539, 552, 565, 580, 593, 610, 622, 662 | 16 | "Editar …" de cada card de configuração, gerenciar navegação / centros (links), remover banner (lista dentro de Dialog) |
| `NavigationContent.tsx` | 187, 188, 203, 204, 206, 208, 209, 219, 220, 221, 222, 226 | 12 | nova coleção / novo link; subir, descer, expandir, editar, remover por item e por filho; novo link em coleção |
| `SolicitacoesContent.tsx` | 117, 173, 174, 190, 191 | 5 | voltar à lista, aceitar, negar, confirmar e cancelar (Dialog) |
| `ProductsContent.tsx` | 170, 171, 172, 173 | 4 | toolbar: nova categoria, exportar CSV, importar CSV, novo produto |
| `ReviewsContent.tsx` | 156, 157, 174 | 3 | editar, excluir e avaliar (cards, não tabela) |
| `EmployeesContent.tsx` | 167, 242, 243 | 3 | novo funcionário; cancelar e salvar (Dialog de permissões) |
| `DistributionCentersContent.tsx` | 139, 157, 158 | 3 | novo centro; editar e remover (lista de `Card`) |
| `EmployeeDetailContent.tsx` | 102 | 1 | salvar permissões |
| `EmployeeFuncionarioDetailContent.tsx` | 107 | 1 | salvar permissões |
| `AdminsContent.tsx` | 129 | 1 | novo administrador |

### Botões de tabela em `components/content/` que ficam (13 em 10 arquivos)

Todos dentro de `render:` de uma `TableColumn`: `PaymentsContent.tsx` 125, 126 ·
`ProductReviewsModerationContent.tsx` 132 · `EmployeeOrdersContent.tsx` 112 ·
`CartContent.tsx` 58 · `CustomersContent.tsx` 81 · `SolicitacoesContent.tsx` 220 ·
`ProductsContent.tsx` 155 · `StockContent.tsx` 167, 168 · `ShippingContent.tsx` 100, 115 ·
`DeletedProductsContent.tsx` 73.

### Decisões de fronteira (confirmar na verificação visual)

Três telas usam **lista de `Card`/`div`, não `Table`**, e por isso entram (leitura literal
de "não os botões das tabelas"): `ReviewsContent` (cards de avaliação),
`DistributionCentersContent` (cards de centro) e `NavigationContent` (árvore de itens).
Os botões por linha/item delas viram texto. Se a intenção era tratar esses controles
por-item como "de tabela" e mantê-los só-ícone, é só mover as linhas correspondentes pra
seção "que ficam" — a regra de conversão não muda.

### Casos que merecem cuidado na conversão

- **Rótulo dinâmico**: `saveLabel`/`submitLabel` (formulários) e
  `ACTION_ICONS[s]`/`ACTION_LABELS[s]` (`OrderDetailContent.tsx:383`, dentro de um `map`,
  com `key`) viram children; o `key` continua no `Button`.
- **Rótulo condicional**: `CheckoutAuth.tsx:116` (login/cadastro conforme `activeTab`) e
  `NavigationContent.tsx:206` (`Recolher`/`Expandir` conforme `isExpanded`) — o children
  reproduz a mesma condição.
- **Botão-link (`as="a"`)**: `CheckoutForm.tsx:151`, `OrderDetailContent.tsx:323/354`,
  `SiteContent.tsx:610/622` — mantêm `as`/`href`/`target`/`rel`, só troca `aria-label` por
  children.
- **Texto longo**: `SiteContent.tsx` ("Editar política de privacidade", "Editar dados
  fiscais da empresa", "Gerenciar centros de distribuição") e `NavigationContent.tsx`
  (`Subir {label}`, `Descer {label}`, `Editar {label}`, `Remover {label}` — 5 botões por
  item, mais 4 por filho) podem apertar o layout, principalmente no mobile (mobile-first).
  Não é motivo pra abreviar por conta própria: aplicar a regra e sinalizar na verificação
  visual quais precisam de texto mais curto.
- **Pares e grupos** (Salvar/Cancelar, Aceitar/Negar, toolbar de `ProductsContent` com 4
  botões): checar se cabem em tela estreita.
- **Botões de largura total / com `className`** (`ProfileDataForm`, `AddressForm`,
  `NavigationContent.tsx:226` com `self-start` etc.): a classe existente continua valendo.

**Consequência assumida**: dentro da mesma tela passam a coexistir botões com texto (ação
da página) e só-ícone (linhas da tabela) — ex. `ProductsContent`: toolbar com texto,
coluna de ações da tabela só com ícone. É intencional (decisão do usuário), não tentar
uniformizar.

## 2. Testes a incluir/alterar

Nenhum teste novo necessário: a troca preserva o **nome acessível** de cada botão — hoje
vem de `aria-label`, depois vem do texto visível (mesma string; Testing Library calcula o
nome acessível igual nos dois casos). Continuam valendo sem alteração os testes que usam
`getByRole('button', { name: ... })`:

- `components/forms/__tests__/*` (ChangePasswordForm, CheckoutAuth, CheckoutForm,
  FiscalCompanyDataForm, LoginForm, NavItemForm, PaymentGatewayForm, ProductForm,
  ProfileDataForm, RegisterForm, RejectPaymentForm, ReviewForm, StockEntryForm,
  StockExitForm);
- os testes de página/conteúdo das 11 telas acima (`app/(employee)/__tests__/*`,
  `app/(admin)/dashboard/admin/__tests__/*`, `app/(customer)/__tests__/reviews.page.test.tsx`,
  `app/(employee)/dashboard/**/__tests__/*` etc.), inclusive os que abrem Dialogs
  (`within(dialog).getByRole('button', ...)`).

Ponto onde o comportamento **muda de fato**: testes que achem o botão por
`getByLabelText`/`getByTitle` (em vez de `getByRole`) deixariam de achá-lo, porque o
`aria-label` some. Verificar com `grep -rn "getByLabelText\|getByTitle"` nos testes dos 38
arquivos e ajustar pra `getByRole('button', { name })` se aparecer algum.

Nomes acessíveis não mudam (só passam a vir do texto em vez do `aria-label`), então a
quantidade de botões que cada `getByRole('button', { name })` encontra também não muda —
inclusive nas telas que misturam botão com texto (ação da página) e só-ícone (tabela).

**Limitação conhecida (`base-ds#38`)**: `npx vitest` não roda neste ambiente (React
duplicado via `base-ds` — a suíte já falha em 92 arquivos no `HEAD`, antes de qualquer
mudança). Validação vai ser `tsc --noEmit` + `eslint` nos arquivos alterados, mais a
confirmação visual do usuário.

## 3. O que entra no projeto

Só frontend — sem mudança de tipo, backend ou rota BFF.

### Componentes (38 arquivos)

Regra mecânica, aplicada em cada uma das 93 ocorrências:

```diff
- <Button iconOnly leftIcon={<Icon name="X" size="sm" />} aria-label="Ação" ... />
+ <Button leftIcon={<Icon name="X" size="sm" />} ...>Ação</Button>
```

Quando o `aria-label` é dinâmico, o texto visível recebe a mesma expressão como children
(`{saveLabel}`, `` {`Editar ${item.label}`} ``, o ternário do `CheckoutAuth`, etc.).

**Formulários — 27 arquivos, 32 ocorrências** (`components/forms/`): `AddressForm`,
`BannerForm`, `CategoryForm`, `ChangePasswordForm`, `CheckoutAuth`, `CheckoutForm` (2),
`ContactForm`, `DistributionCenterForm`, `EmployeeForm` (2), `FaviconForm`,
`FiscalCompanyDataForm`, `LoginForm`, `LogoForm`, `MarkdownContentForm`, `NavItemForm`,
`PaymentConfirmForm` (2), `PaymentGatewayForm`, `PlaceholderImageForm`, `ProductForm`,
`ProfileDataForm`, `RegisterForm`, `RejectPaymentForm` (2), `ReviewForm` (2),
`SiteMetadataForm`, `SocialLinksForm`, `StockEntryForm`, `StockExitForm`.

**Ações das telas — 11 arquivos, 61 ocorrências** (`components/content/`): os arquivos e
linhas da tabela na seção 1.

### Critério de pronto

- `grep -rn "iconOnly" components/forms --include="*.tsx" --exclude-dir=__tests__` → 0.
- `grep -rn "iconOnly" components/content --include="*.tsx"` → exatamente **13**, todos
  dentro de `render:` de `TableColumn` (lista na seção 1); `grep -c iconOnly` dá 0 nos 11
  arquivos convertidos, exceto `SolicitacoesContent.tsx` e `ProductsContent.tsx`, que
  ficam com 1 cada (linhas 220 e 155, células de tabela).
- Total no projeto: 119 → **26**.
- `git diff --name-only` só lista arquivos dentro de `components/forms/` e dos 11 arquivos
  de `components/content/`; nenhum de `admin/`, `employee/`, `cart/`, `product/`, `layout/`
  ou `ui/`.
- `npx tsc --noEmit` limpo; `eslint` nos arquivos alterados sem problema novo.
- Confirmação visual do usuário (formulários, Dialogs e telas de conteúdo, desktop e
  mobile) antes de qualquer commit.
