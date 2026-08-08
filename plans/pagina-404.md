# Página de 404

## 1. Problemas encontrados

- Não existe `app/not-found.tsx` — rotas inexistentes caem no 404 genérico do Next.js, sem a identidade visual do site (sem Navbar/Footer, sem `base-ds`).
- `components/layout/AppShell.tsx` depende de `useSiteSettings` (`contexts/SiteSettingsContext.tsx`), cujo provider já é montado globalmente em `app/layout.tsx` via `RootProviders` — pode ser usado fora do route group `(public)`, então `app/not-found.tsx` (nível raiz, fora de qualquer `layout.tsx` de grupo) pode envolver o conteúdo com `AppShell` diretamente e manter navbar/footer consistentes.
- `base-ds`'s `Button` não suporta `href`/`asChild` (gap já documentado em `app/(public)/page.tsx:23-29`, onde um `Link` é estilizado manualmente para imitar o `Button` primário). A página de 404 precisa do mesmo link "voltar para o início", reaproveitando o mesmo workaround — reforça a necessidade de abrir issue no `indianous/base-ds` (convenção do `CLAUDE.md`).

## 2. Testes a incluir

**`frontend/app/__tests__/not-found.test.tsx`** (novo)
- renderiza heading de nível 1.
- renderiza link "Voltar para o início" com `href="/"`.
- renderiza a navegação principal do `AppShell` (role `navigation`, nome `/main navigation/i`).
- renderiza o footer (role `contentinfo`).

## 3. O que entra no projeto

- **Tipos**: nenhum.
- **Backend**: nenhum.
- **BFF**: nenhum.
- **Componentes**: nenhum novo — reaproveita `AppShell`, `Heading`, `Text` (`base-ds`).
- **Páginas**: `app/not-found.tsx` (novo, catch-all global de 404).
- **Ação externa**: abrir issue no `indianous/base-ds` sobre `Button` não suportar `href`/`asChild`.
