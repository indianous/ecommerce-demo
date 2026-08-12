# Logo (triângulo em SVG) cadastrado como logo da loja

## Contexto

O upload de logo já é uma feature completa hoje — `LogoForm.tsx` →
`PUT /api/site/settings/logo` → backend só aceita `image/svg+xml`
(`SiteSettingsController.ALLOWED_LOGO_TYPES`), grava em
`SiteSettingsResponse.logoUrl`, e `SiteContent.tsx` já mostra o logo
atual dentro do card de gerenciamento. O SVG do triângulo bate certo
com essa restrição (só aceita SVG).

**Mas cadastrar o logo, do jeito que o site está hoje, não teria
nenhum efeito visível.** `SiteSettingsContext.tsx` (o contexto que
`AppShell`/`Navbar` consultam) busca `GET /api/site/settings` e expõe
`placeholderImageUrl`, `faviconUrl`, `instagram/tiktok/facebookUrl`,
`navbarItems`, `footerColumns` — mas **não `logoUrl`**, mesmo o campo
já vindo na resposta (o teste
`contexts/__tests__/SiteSettingsContext.test.tsx` já mocka
`logoUrl: null` na resposta, só não é usado em lugar nenhum do
contexto). E `AppShell.tsx` renderiza o `logo` do `Navbar` como texto
fixo `"Loja"`, sem checar `logoUrl` nunca. Então, sem essa correção, o
triângulo ficaria só salvo no banco e visível no painel admin — o site
público continuaria mostrando o texto "Loja".

Cor escolhida pro triângulo: `#2563eb`, que é exatamente o valor de
`--color-primary`/`--color-blue-600` já usado em todo o site (botões
primários, link "Voltar para o início" da 404, etc. — ver
`node_modules/base-ds/dist/styles/theme.css:35,115`) — mantém o logo
consistente com a cor de marca já estabelecida, em vez de inventar uma
cor nova. `base-ds` não tem dark mode (`app/globals.css:21-22`
documenta isso explicitamente), então uma cor de preenchimento fixa é
suficiente — não precisa de `currentColor`, que também não
funcionaria aqui mesmo (o SVG é carregado como arquivo via `<img
src>`, não inline no DOM, então não herda cor da página).

## 1. Problemas encontrados

- `contexts/SiteSettingsContext.tsx:9-16,64-96` — `logoUrl` ausente da
  interface, do estado e do `.then()` que popula o contexto a partir
  de `GET /api/site/settings`.
- `components/layout/AppShell.tsx:47-49` — `logo` do `Navbar` é texto
  fixo `"Loja"`, nunca consulta `logoUrl` do contexto.

## 2. Testes a incluir/alterar

- `contexts/__tests__/SiteSettingsContext.test.tsx` (existente) —
  `Probe` passa a expor `logoUrl` também; novo teste: com
  `GET /api/site/settings` retornando `logoUrl:
  'https://cdn.example.com/logo.svg'`, o contexto expõe esse valor
  (mesmo padrão dos testes já existentes de
  `placeholderImageUrl`/`faviconUrl`, que devem existir mais acima no
  arquivo — seguir o mesmo formato).

- `components/layout/__tests__/AppShell.test.tsx` (existente)
  - novo: com `SiteSettingsContext.Provider` tendo `logoUrl:
    'https://cdn.example.com/logo.svg'`, o `Navbar` renderiza uma
    imagem com esse `src` dentro do link pra `/`, e o texto "Loja"
    **não** aparece
  - novo (regressão): com `logoUrl: null` (todos os testes existentes
    já usam esse valor), continua mostrando o texto "Loja" — mesmo
    comportamento de hoje, sem quebrar nenhum teste já escrito

## 3. O que entra no projeto

Sem tipos novos — `SiteSettings.logoUrl` (`types/index.ts:21`) já
existe e já está correto.

### `contexts/SiteSettingsContext.tsx`

Adiciona `logoUrl` ao `SiteSettingsContextValue`, ao valor default do
`createContext`, ao `useState` e ao `.then()` que já popula os outros
campos a partir da mesma resposta de `/api/site/settings` — mesmo
padrão de `placeholderImageUrl`/`faviconUrl` já existentes ali.

### `components/layout/AppShell.tsx`

```tsx
const { logoUrl, instagramUrl, tiktokUrl, facebookUrl, navbarItems, footerColumns } = useSiteSettings()

// ...

logo={
  <Link href="/" className="flex items-center">
    {logoUrl ? (
      <Image src={logoUrl} alt="Logo da loja" aspectRatio="square" objectFit="contain" className="h-8 w-8" />
    ) : (
      <span className="text-lg font-semibold text-foreground">Loja</span>
    )}
  </Link>
}
```

Import de `Image` do `base-ds` (já usado em outros componentes do
projeto).

### O SVG do triângulo

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <polygon points="50,10 92,86 8,86" fill="#2563eb" stroke="#2563eb" stroke-width="4" stroke-linejoin="round"/>
</svg>
```

Triângulo equilátero simples, `viewBox` quadrado (bate com
`aspectRatio="square"` do `Image` acima), `stroke` da mesma cor do
`fill` só pra suavizar os ângulos (`stroke-linejoin="round"`) sem
mudar a silhueta.

### Cadastro (ação manual, fora do código)

Com backend+frontend rodando (`/run`):

1. Login como `ADMIN` ou `EMPLOYEE` com `MANAGE_SITE`.
2. `/dashboard/(admin/)site` → card "Logo" → "Gerenciar" → upload do
   arquivo `.svg` acima via `LogoForm`.
3. Confirmar visualmente que a home (`/`) passa a mostrar o triângulo
   no lugar do texto "Loja" na navbar.

Esse passo só funciona **depois** da correção da seção 3 (sem ela, o
upload salva mas a navbar continua mostrando texto).
