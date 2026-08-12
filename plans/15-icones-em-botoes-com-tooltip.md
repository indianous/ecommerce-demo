# Ícones em botões + tooltip no hover (frontend)

## Contexto

Escopo confirmado com o usuário: **todos** os botões do site trocam o
texto visível por um ícone, e **todo** botão que virar ícone ganha um
balão (tooltip) mostrando o nome/função ao passar o mouse.

Levantamento: **117 instâncias de `<Button>` (base-ds) em 50
arquivos**, mais **6 triggers `<button>` nativos** já icon-only hoje
(feitos à mão porque o `Button` do base-ds não suporta bem ícone puro
— ver abaixo). Lista completa na seção 3.

### Duas peças que faltam no base-ds

1. **Botão icon-only** — já existe issue aberta,
   [`indianous/base-ds#12`](https://github.com/indianous/base-ds/issues/12)
   ("Button: variante/tamanho icon-only"), pedida numa sessão
   anterior. O corpo da issue já lista os 6 lugares que hoje usam
   `<button>` nativo por causa dessa lacuna: `AdminShell.tsx`,
   `EmployeeShell.tsx` (hambúrguer), `CartCardItem.tsx` (remover
   item), `orders/page.tsx` (expandir pedido), `DuelingPicklist.tsx`
   (setas), `SidebarAvatar.tsx` (trigger do avatar). Continua aberta,
   sem previsão — este plano **não bloqueia** nela.
2. **Tooltip** — não existe no base-ds nem em lugar nenhum do projeto
   hoje (confirmado nos exports de `base-ds` e por busca no repo).
   Issue aberta:
   [`indianous/base-ds#15`](https://github.com/indianous/base-ds/issues/15)
   ("Adicionar componente Tooltip"), seguindo a convenção do projeto
   de abrir issue antes de implementar workaround local. Continua sem
   previsão — o `components/ui/Tooltip.tsx` local (seção 3) é o
   workaround até ela ser resolvida, e vira o ponto único de migração
   depois.

### Decisão de arquitetura

Em vez de resolver isso arquivo por arquivo (que é como os 6 triggers
nativos de hoje foram feitos — cada um com seu próprio SVG ou
caractere solto tipo `"↑"`/`"→"` fazendo dupla função de conteúdo
visual e nome acessível), as 123 conversões passam por **dois
componentes locais novos em `components/ui/`** (mesma pasta onde já
vive o `DuelingPicklist.tsx`, que é o precedente do projeto pra
componente bespoke não coberto pelo base-ds):

- `components/ui/Tooltip.tsx` — primitivo genérico, mostra o balão no
  `mouseenter`/`focus` do filho, esconde no `mouseleave`/`blur`.
- `components/ui/IconButton.tsx` — usa `Tooltip` por dentro. Recebe
  `icon` (nome do `lucide-react`, mesmo padrão de `IconName` que o
  `Icon` do base-ds já usa) e `label` (uma string só, usada **ao mesmo
  tempo** como `aria-label` do botão e como texto do tooltip). Suporta
  `as="a"` do mesmo jeito que o `Button` do base-ds, pros CTAs que
  hoje são link (ex. "Continuar para pagamento").

Isso vira o único ponto de migração: quando a `#12` for resolvida no
base-ds, troca-se o miolo do `IconButton` pra delegar pro `Button
size="icon"` real, sem tocar nos ~123 pontos de uso.

### Regra de migração (nome acessível não muda)

Em todo lugar onde hoje existe `aria-label` (ou onde o texto visível
vira o `label` do `IconButton`), o valor usado é **exatamente o texto
visível atual** (ex. "Salvar" continua "Salvar", só que como
`aria-label`/tooltip em vez de texto na tela). Isso preserva os testes
que já buscam por `getByRole('button', { name: ... })` — busquei no
repo inteiro por `getByText(...)` com esses rótulos e **não existe
nenhum** teste que dependa do texto visível do botão; a suíte já
consulta por role+name. A única exceção real é o `DuelingPicklist`,
onde o nome acessível hoje É o caractere solto (`"→"`, `"←"`) — vira
um nome descritivo de verdade, então os testes desse componente
**precisam** mudar (ver seção 2).

### Riscos sinalizados (recomendação, não bloqueio)

Convertendo tudo como pedido, mas quero deixar registrado por escrito
antes de implementar:

| Onde | Risco | Recomendação |
|---|---|---|
| CTAs principais: "Adicionar ao carrinho", "Finalizar Pedido", "Entrar", "Cadastrar", "Ver catálogo", "Continuar para pagamento" | Tooltip só aparece no hover — **não existe hover em touch**. Em mobile (a maior parte do tráfego de compra), o botão mais importante do funil vira um ícone sem nenhuma pista visível até o toque. | Considerar manter texto nesses ~7 botões específicos. Vou converter como pedido, mas fica marcado na tabela da seção 3. |
| Chips de filtro "Todos"/"Pendentes"/"Aprovados"/"Rejeitados" (`SolicitacoesContent.tsx`) | Não são uma ação, são o próprio nome do estado sendo filtrado — não existe ícone universal pra "Aprovados". Convertido, os 4 botões ficam visualmente indistinguíveis sem passar o mouse um por um. | **Excluí do escopo** por padrão nesta versão do plano — risco de quebrar a funcionalidade, não só a estética. Avise se quiser incluir mesmo assim. |
| "Negar" solicitação (`SolicitacoesContent.tsx:169-171`) | Ação irreversível que hoje já dispara direto no `onClick`, **sem Dialog de confirmação** (diferente de "Rejeitar" pagamento, que abre `Dialog` via `rejectTarget`). Tirar o texto piora o risco de clique acidental num botão que já não tem rede de segurança. | Incluí no escopo deste plano abrir um `Dialog` de confirmação pra "Negar", igual ao padrão que "Rejeitar pagamento" já usa — é uma consequência direta de tirar o texto desse botão específico. |

## 1. Problemas encontrados

- Nenhum componente de tooltip existe no projeto (confirmado em
  `node_modules/base-ds/dist/index.d.ts` e por busca `*tooltip*` no
  repo — zero resultados).
- `components/cart/CartCardItem.tsx:19-27` — botão de remover item usa
  `<button>` nativo com SVG desenhado à mão (um "X" em `<line>`s), em
  vez do `Icon` do base-ds.
- `components/ui/DuelingPicklist.tsx` — 4 botões de mover item usam o
  caractere (`"→"`, `"←"`, `"→→"`, `"←←"`) como conteúdo visual **e**
  nome acessível ao mesmo tempo — não é um ícone real, `screen
  reader` lê literalmente "seta pra direita" via glifo Unicode, nome
  pouco descritivo.
- `app/(employee)/dashboard/site/navigation/NavigationContent.tsx:218-219`
  (espelhado no admin) — mesmo padrão: `"↑"`/`"↓"` como texto do
  `Button`, com `aria-label` correto (`Subir X`/`Descer X`) já
  presente — esses dois **já têm o nome certo**, só falta o ícone de
  verdade e o tooltip.
- `app/(employee)/dashboard/site/SiteContent.tsx` — 11 botões
  idênticos com texto "Editar" (linhas 412, 427, 442, 457, 485, 498,
  511, 527, 540, 553, 568, 581), um por card de configuração
  (logo, favicon, metadados, contato, etc). Convertidos pra ícone sem
  cuidado, os 11 ficam idênticos — o tooltip precisa ser específico da
  seção ("Editar logo", "Editar metadados"...), não um "Editar"
  genérico repetido.
- 16 formulários dentro de `Dialog` com botão "Salvar" idêntico
  (`components/forms/{Banner,Category,Contact,Favicon,Logo,
  MarkdownContent,NavItem,PaymentGateway,PlaceholderImage,Product,
  SiteMetadata,SocialLinks,StockEntry,StockExit,FiscalCompanyData,
  Employee}Form.tsx`) — mesmo problema: o componente de formulário não
  sabe o nome da própria seção, então "Salvar" genérico não dá pra
  virar tooltip sem contexto. Precisa vir como prop de quem abre o
  `Dialog` (que já sabe o título).
- 4 pontos com **ícone dependente de estado**, não fixo:
  `CheckoutAuth.tsx:117` (Entrar/Criar Conta por aba),
  `ProductsContent.tsx:146` (Tornar Indisponível/Disponível),
  `NavigationContent.tsx:203` (Expandir/Recolher),
  `OrderDetailContent.tsx:339` (`ACTION_LABELS[s]`, um rótulo por
  transição de status possível do pedido — o maior de todos, precisa
  de uma tabela status→ícone própria).
- `SolicitacoesContent.tsx:169-171` — "Negar" dispara ação irreversível
  sem `Dialog` de confirmação (ver tabela de riscos acima).

## 2. Testes a incluir/alterar

- `components/ui/__tests__/Tooltip.test.tsx` (novo)
  - balão não está no DOM antes do hover/focus
  - `mouseenter` no filho → balão aparece com `role="tooltip"` e o
    texto de `label`
  - `mouseleave` → balão some
  - `focus` no filho (navegação por teclado) → balão aparece;
    `blur` → some

- `components/ui/__tests__/IconButton.test.tsx` (novo)
  - renderiza o `Icon` do base-ds com o `name` recebido
  - `aria-label` do botão é igual ao `label` (nome acessível não some)
  - hover mostra o tooltip com o mesmo texto de `label`
  - `as="a" href="..."` renderiza `<a>` em vez de `<button>`
  - `disabled` bloqueia clique e não mostra tooltip interativo além do
    esperado (mesmo comportamento de um botão disabled comum)

- `components/ui/__tests__/DuelingPicklist.test.tsx` (existente,
  **precisa mudar**) — os 4 `getByRole('button', { name: /^→$/ })`
  (e `←`, `→→`, `←←`) passam a buscar o nome descritivo novo, ex.
  `{ name: /mover selecionad._ para a direita/i }`. É a única
  quebra de nome acessível deste plano — todo o resto preserva o
  texto atual como `aria-label`/tooltip.

- `app/(employee)/dashboard/change-requests/__tests__/...` (existente,
  se houver cobertura de `handleReject`) — precisa cobrir o novo
  `Dialog` de confirmação do "Negar": abre o dialog em vez de chamar
  a action direto; só confirma a rejeição depois do clique no botão
  de confirmação dentro do dialog. Mesmo padrão de teste já usado pra
  "Rejeitar pagamento" (`PaymentsContent`/`RejectPaymentForm`).

- Varredura feita no restante da suíte: nenhum teste hoje usa
  `getByText(...)` pros rótulos convertidos (`Salvar`, `Editar`,
  `Excluir`, `Remover`, `Cancelar`, `Confirmar`, `Aceitar`, `Negar`,
  `Rejeitar`, `Cadastrar`, `Entrar`) — todos já consultam por
  `role`+`name`, então continuam passando sem alteração depois da
  troca de texto por ícone, contanto que o `label`/`aria-label` seja
  preservado igual ao texto de hoje (regra da seção "Contexto").

## 3. O que entra no projeto

Sem tipos novos, sem mudança de backend/BFF.

### `components/ui/Tooltip.tsx` (novo)

```tsx
'use client'
import { useState, type ReactElement } from 'react'

interface TooltipProps {
  label: string
  children: ReactElement
}

export function Tooltip({ label, children }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const show = () => setOpen(true)
  const hide = () => setOpen(false)

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background"
        >
          {label}
        </span>
      )}
    </span>
  )
}
```

### `components/ui/IconButton.tsx` (novo)

```tsx
'use client'
import { Icon, type IconProps } from 'base-ds'
import { Tooltip } from '@/components/ui/Tooltip'

type IconButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
type IconButtonSize = 'sm' | 'md' | 'lg'

interface CommonProps {
  icon: IconProps['name']
  label: string
  variant?: IconButtonVariant
  size?: IconButtonSize
}

type AsButton = CommonProps & { as?: 'button' } & Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'
>
type AsLink = CommonProps & { as: 'a'; href: string } & Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>, 'aria-label'
>

export function IconButton(props: AsButton | AsLink) {
  const { icon, label, variant = 'ghost', size = 'md', ...rest } = props
  const sizeClass = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' }[size]
  const variantClass = ICON_BUTTON_VARIANT_CLASSES[variant]

  const content = <Icon name={icon} size={size === 'lg' ? 'lg' : 'sm'} />

  return (
    <Tooltip label={label}>
      {props.as === 'a' ? (
        <a
          aria-label={label}
          className={`inline-flex items-center justify-center rounded-full ${sizeClass} ${variantClass}`}
          {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {content}
        </a>
      ) : (
        <button
          type="button"
          aria-label={label}
          className={`inline-flex items-center justify-center rounded-full ${sizeClass} ${variantClass}`}
          {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {content}
        </button>
      )}
    </Tooltip>
  )
}
```

`ICON_BUTTON_VARIANT_CLASSES` é um mapa fixo aproximando visualmente
as variantes que o `Button` do base-ds já usa hoje (`ghost`/`outline`/
`danger`/...) — ajuste fino de cor/hover durante a implementação, o
`base-ds` não expõe essas classes pra reaproveitar diretamente.

### Migração dos 123 pontos de uso

Tabela completa, agrupada por área. `IB` = vira `IconButton`; onde a
recomendação da seção "Riscos" é manter texto, marco explicitamente.

**Home / CTAs principais — recomendo manter texto (ver Riscos)**

| Arquivo:linha | Texto atual | Ícone proposto |
|---|---|---|
| `app/(public)/page.tsx:38` | "Ver catálogo" | `ArrowRight` |
| `components/forms/LoginForm.tsx:69` | "Entrar" | `LogIn` |
| `components/forms/RegisterForm.tsx:81` | "Cadastrar" | `UserPlus` |
| `components/forms/CheckoutAuth.tsx:117` | "Entrar" / "Criar Conta" (por aba) | `LogIn` / `UserPlus` |
| `components/forms/CheckoutForm.tsx:80` | "Continuar para pagamento" | `ArrowRight` |
| `components/forms/CheckoutForm.tsx:126` | "Finalizar Pedido" | `Check` |
| `components/product/AddToCartButton.tsx` / `ProductCard.tsx:99` | "Adicionar ao carrinho" | `ShoppingCart` |

**Customer**

| Arquivo:linha | Texto atual | Ícone proposto | Observação |
|---|---|---|---|
| `app/(customer)/cart/page.tsx:58` | "Remover" | `Trash2` | destrutivo |
| `app/(customer)/reviews/page.tsx:153` | "Editar" | `Pencil` | |
| `app/(customer)/reviews/page.tsx:156` | "Excluir" | `Trash2` | destrutivo |
| `app/(customer)/reviews/page.tsx:180` | "Avaliar" | `Star` | |
| `app/(customer)/reviews/page.tsx:221` | "Excluir" (dialog confirmação) | `Trash2` | destrutivo |
| `app/(customer)/reviews/page.tsx:224` | "Cancelar" | `X` | |
| `components/forms/AddressForm.tsx:75` | "Adicionar endereço" | `Plus` | |
| `components/forms/ChangePasswordForm.tsx:95` | "Alterar senha" | `KeyRound` | |
| `components/forms/ProfileDataForm.tsx:23` | "Salvar" | `Save` | |
| `components/forms/ReviewForm.tsx:78` | `{submitLabel}` (dinâmico) | `Save` | mapear por `submitLabel` usado em cada chamador |
| `components/forms/ReviewForm.tsx:82` | "Cancelar" | `X` | |
| `components/cart/CartDrawer.tsx:20` | "Carrinho ({itemCount})" | `ShoppingCart` + `Badge` com o contador sobreposto | |
| `components/cart/CartCardItem.tsx:19` (já nativo) | aria-label "Remover {item}" | `Trash2` (troca o SVG à mão) | destrutivo |
| `app/(customer)/orders/page.tsx:97` (já nativo) | aria-label "Expandir #{pedido}" | mantém `Icon` já usado | |

**Employee / Admin (admin espelha employee nos mesmos componentes)**

| Arquivo:linha | Texto atual | Ícone proposto | Observação |
|---|---|---|---|
| `.../EmployeeDetailContent.tsx` (admin+employee) | "Salvar permissões" | `Save` | |
| mesmo arquivo | "Redefinir senha" | `KeyRound` | botão já é `disabled` fixo hoje — sem handler, fora de escopo até ganhar implementação |
| `employees/page.tsx` (admin+employee) | "Cancelar" / "Salvar" (dialog permissões) | `X` / `Save` | |
| `customers/CustomersContent.tsx:63` | "Buscar" | `Search` | |
| `customers/CustomersContent.tsx:87` | "Ver detalhe" | `Eye` | |
| `change-requests/SolicitacoesContent.tsx:109` | "← Voltar à lista" | `ArrowLeft` | |
| `change-requests/SolicitacoesContent.tsx:167` | "Aceitar" | `Check` | |
| `change-requests/SolicitacoesContent.tsx:170` | "Negar" | `Ban` | destrutivo, **ganha Dialog de confirmação** (ver Riscos) |
| `change-requests/SolicitacoesContent.tsx:199,206,213,220` | "Todos"/"Pendentes"/"Aprovados"/"Rejeitados" | — | **excluído do escopo** (ver Riscos) |
| `change-requests/SolicitacoesContent.tsx:263` | "Ver detalhe" | `Eye` | |
| `orders/[id]/OrderDetailContent.tsx:273` | "Emitir NF-e" | `FileText` | |
| `orders/[id]/OrderDetailContent.tsx:297` | "Ver nota" | `FileText` | link pro DANFE |
| `orders/[id]/OrderDetailContent.tsx:316` | "Atualizar status" | `RefreshCw` | |
| `orders/[id]/OrderDetailContent.tsx:326` | "Tentar novamente" | `RotateCcw` | |
| `orders/[id]/OrderDetailContent.tsx:339` | `{ACTION_LABELS[s]}` (por status-alvo) | 1 ícone por transição (ex. `Truck` p/ "enviado", `PackageCheck` p/ "entregue") — mapear `ACTION_LABELS` inteiro | maior esforço de mapeamento do plano |
| `orders/[id]/OrderDetailContent.tsx:366` | "Confirmar mudança" | `Check` | |
| `orders/[id]/OrderDetailContent.tsx:367,408` | "Cancelar" | `X` | |
| `orders/[id]/OrderDetailContent.tsx:375` | "Solicitar retrocesso" | `RotateCcw` | |
| `orders/[id]/OrderDetailContent.tsx:407` | "Enviar solicitação" | `Send` | |
| `orders/OrdersContent.tsx:123` | "Ver detalhe" | `Eye` | |
| `payments/PaymentsContent.tsx:111` | "Confirmar" | `Check` | |
| `payments/PaymentsContent.tsx:119` | "Rejeitar" | `Ban` | destrutivo, já tem `Dialog` de confirmação — mantém |
| `products/deleted/DeletedProductsContent.tsx:78` | "Restaurar" | `Undo2` | |
| `products/[id]/reviews/ProductReviewsModerationContent.tsx:89,109,112` | "Remover" / "Cancelar" | `Trash2` / `X` | destrutivo |
| `products/ProductsContent.tsx:141` | "Editar" | `Pencil` | |
| `products/ProductsContent.tsx:146` | "Tornar Indisponível" / "Tornar Disponível" | `EyeOff` / `Eye` | dinâmico por estado |
| `products/ProductsContent.tsx:156` | "Excluir" | `Trash2` | destrutivo |
| `products/ProductsContent.tsx:172` | "Nova categoria" | `FolderPlus` | |
| `products/ProductsContent.tsx:173` | "Novo produto" | `Plus` | |
| `shipping/ShippingContent.tsx:74` | "Registrar envio" | `Truck` | |
| `site/navigation/NavigationContent.tsx:184` | "Nova coleção" | `FolderPlus` | |
| `site/navigation/NavigationContent.tsx:185` | "Novo link" | `Link` | |
| `site/navigation/NavigationContent.tsx:200,218` | "↑" | `ChevronUp` | já tinha aria-label certo, só falta ícone real |
| `site/navigation/NavigationContent.tsx:201,219` | "↓" | `ChevronDown` | idem |
| `site/navigation/NavigationContent.tsx:203` | "Expandir"/"Recolher" | `ChevronRight`/`ChevronDown` | dinâmico |
| `site/navigation/NavigationContent.tsx:207,220` | "Editar" | `Pencil` | |
| `site/navigation/NavigationContent.tsx:208,221` | "Remover" | `Trash2` | destrutivo |
| `site/navigation/NavigationContent.tsx:225` | "Novo link" (em item filho) | `Plus` | |
| `site/navigation/NavigationContent.tsx:267,268` | "Cancelar" / "Remover" (dialog) | `X` / `Trash2` | destrutivo |
| `site/SiteContent.tsx` (11x: 412,427,442,457,485,498,511,527,540,553,568,581) | "Editar" | `Pencil` | tooltip **específico da seção** (ver Problemas), não "Editar" genérico |
| `site/SiteContent.tsx:470` | "Gerenciar" (banners) | `Images` | |
| `site/SiteContent.tsx:594` | "Gerenciar navegação" | `Menu` | |
| `site/SiteContent.tsx:633` | "Remover" (banner) | `Trash2` | destrutivo |
| `stock/StockContent.tsx:177` | "Entrada" | `ArrowDownToLine` | |
| `stock/StockContent.tsx:178` | "Saída" | `ArrowUpFromLine` | |
| `components/admin/EmployeeManagementTable.tsx:28` | aria-label "Permissões de X" | `Shield` | |
| `components/admin/EmployeeManagementTable.tsx:36` | aria-label "Excluir X" | `Trash2` | destrutivo |
| `components/admin/EmployeeManagementTable.tsx:51` | "Novo funcionário" | `UserPlus` | |
| `components/layout/UserMenu.tsx:37` | já sem texto (children = `Avatar`) | mantém `Avatar`, só ganha `Tooltip` | |
| `components/ui/DuelingPicklist.tsx` (4 botões) | "→"/"←"/"→→"/"←←" | `ChevronRight`/`ChevronLeft`/`ChevronsRight`/`ChevronsLeft` | nome acessível muda de verdade — únicos testes que quebram (ver seção 2) |

**16 formulários com "Salvar" genérico** (`BannerForm`, `CategoryForm`,
`ContactForm`, `FaviconForm`, `LogoForm`, `MarkdownContentForm`,
`NavItemForm`, `PaymentGatewayForm`, `PlaceholderImageForm`,
`ProductForm`, `SiteMetadataForm`, `SocialLinksForm`,
`StockEntryForm`, `StockExitForm`, `FiscalCompanyDataForm`,
`EmployeeForm`) — ícone `Save`, mas o `label` passa a ser prop
recebida de quem abre o `Dialog` (que já sabe o título da seção), não
um valor fixo dentro do form. Ex.: `SiteMetadataForm` recebe
`saveLabel="Salvar metadados"` do `SiteContent.tsx`.

- `PaymentConfirmForm.tsx:36,39` — "Confirmar pagamento" → `Check`,
  "Cancelar" → `X`
- `RejectPaymentForm.tsx:36,39` — "Confirmar rejeição" → `Ban`
  (destrutivo, já tem o próprio `Dialog` como confirmação), "Cancelar"
  → `X`
- `EmployeeForm.tsx:50` — "Cancelar" → `X`

### Fix de escopo direto: confirmação pro "Negar"

`change-requests/SolicitacoesContent.tsx` — extrai o `onClick` do
botão "Negar" pra abrir um `Dialog` (mesmo padrão de `rejectTarget` em
`PaymentsContent.tsx`) em vez de chamar `handleReject` direto. Só
existe por causa da troca de texto pra ícone (ver tabela de Riscos).

### Fora de escopo

- Chips de filtro "Todos"/"Pendentes"/"Aprovados"/"Rejeitados" — ver
  Riscos.
- "Redefinir senha" em `EmployeeDetailContent` — já é `disabled` sem
  handler, não é uma ação real hoje.
- Suporte a touch (long-press revelando o tooltip) — não foi pedido;
  o risco de hover-only em mobile fica registrado na seção de Riscos,
  mas a implementação segue só com hover + focus por teclado.
