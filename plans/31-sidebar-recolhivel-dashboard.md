# 31 — Sidebar do dashboard fixa na lateral e recolhível

## Contexto

Issue [indianous/base-ds#23](https://github.com/indianous/base-ds/issues/23) foi
resolvida: `Sidebar` (e `Button`, issue #19) agora aceitam `asChild`, permitindo compor
o item de navegação com `next/link` sem perder a navegação client-side. Isso desbloqueia
adotar o `Sidebar` oficial do `base-ds` no menu lateral do dashboard admin/employee, que
até então era implementado à mão (`<nav><ul><Link>`).

## 1. Problemas encontrados

- `components/admin/AdminShell.tsx:42-63` e `components/employee/EmployeeShell.tsx:51-72`
  implementam a sidebar desktop com `<nav>` estático — sem posição fixa (rola junto com
  a página) e sem opção de recolher.
- `components/admin/SidebarAvatar.tsx` já tinha uma prop `collapsed` pronta desde antes,
  nunca conectada (`feedback_mobile_first`, memória de sessão anterior, já documentava a
  intenção de usar `Sidebar` do base-ds com `collapsed` elevado via `onCollapse`).
- `Sidebar` do base-ds trata `collapsed` como valor **inicial** apenas (`useState(collapsed
  ?? false)`, sem `useEffect` sincronizando mudanças posteriores da prop) — não é
  totalmente controlado. Decisão: não persistir o estado em `localStorage` por causa
  disso (persistir exigiria ler localStorage antes do primeiro render do `Sidebar` sem
  quebrar hidratação SSR, e o `Sidebar` não reagiria a uma mudança tardia da prop mesmo
  assim). Como `AdminShell`/`EmployeeShell` rodam num layout do Next.js App Router, o
  estado sobrevive normalmente entre navegações dentro do dashboard — só reseta em reload
  completo.
- Toggle button do `Sidebar` tem `aria-label="Toggle sidebar"` fixo em inglês, sem prop
  pra customizar (mesma classe de gap de i18n do #24) — não bloqueia, mas fica anotado
  aqui caso valha abrir issue depois.

## 2. Testes a incluir/alterar

- `components/admin/__tests__/AdminShell.test.tsx` e
  `components/employee/__tests__/EmployeeShell.test.tsx`: teste de
  `nav.toHaveClass('hidden')` trocado pra `nav.parentElement.toHaveClass('hidden',
  'md:block')`, já que `hidden md:block` agora fica no `<div>` que envolve o `Sidebar`
  (evita conflito de especificidade entre a classe `flex` fixa do `Sidebar` e um
  `hidden`/`md:flex` aplicado direto nele).
- Novo bloco `Sidebar recolhível (desktop)` nos dois arquivos: clicar no botão
  `Toggle sidebar` esconde o rótulo dos itens (viram `span.sr-only`) e o nome no
  `SidebarAvatar` também vira `sr-only`.
- Resto dos testes (itens de menu, `aria-current`, drawer mobile) roda como regressão —
  sem mudança de asserção, já que `Sidebar` com `asChild` renderiza o mesmo `<a href>`
  via `next/link` com o mesmo texto/href/aria-current de antes.

## 3. O que entra no projeto

- `AdminShell.tsx`/`EmployeeShell.tsx`: `navItems`/`ALL_NAV_ITEMS` ganham um campo
  `icon: IconName` por item (ícones do Lucide: `ClipboardList`, `Truck`, `ListChecks`,
  `Package`, `Boxes`, `Trash2`, `Users`, `UserCog`, `CreditCard`, `History`, `Globe`,
  `BarChart3`, `ExternalLink`).
- Sidebar desktop trocada pelo `Sidebar` do `base-ds`, dentro de
  `<div className="hidden md:block sticky top-0 h-screen">` (fixa na lateral durante o
  scroll da página). Cada item vira `{ label, icon: <Icon .../>, active, asChild: <Link
  href={item.href} ... /> }`.
- Estado `collapsed` elevado em `AdminShell`/`EmployeeShell` via `onCollapse`, repassado
  pro `Sidebar` (`collapsed`) e pro `SidebarAvatar` no slot `footer`.
- Drawer mobile mantido como estava (texto, sem ícones, sem recolher) — só a versão
  desktop ganha a UX nova.
