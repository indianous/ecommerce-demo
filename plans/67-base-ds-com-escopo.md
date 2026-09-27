# 67 — base-ds pelo nome com escopo e limpeza das soluções provisórias

Resolve a issue [indianous/ecommerce-frontend#24](https://github.com/indianous/ecommerce-frontend/issues/24)
e, na mesma troca de versão, tira as soluções provisórias que o app tinha enquanto o base-ds não
resolvia as issues #47 a #50. Só frontend.

## Contexto

O base-ds é instalado do GitHub Packages por um alias do npm:

```json
"base-ds": "npm:@indianous/base-ds@^0.4.0"
```

O PR #23 configurou o Dependabot (`.github/dependabot.yml`, segredo `GH_PACKAGES_TOKEN`) para testar a
issue indianous/base-ds#44. Nas execuções depois do merge, o Dependabot procurou o pacote pelo **nome do
alias** (`GET https://npm.pkg.github.com/base-ds → 404`) e falhou com `dependency_file_not_resolvable`.
A autenticação funciona; o problema é o alias. Sem a troca, o job falha toda semana e nenhum PR de
atualização é aberto.

O lock está na `0.4.2`. Desde então saíram:

| Versão | Issue | O que mudou | Solução provisória no app |
| --- | --- | --- | --- |
| 0.4.3 | #47 | `PasswordInput`: `showLabel` e `hideLabel` | Testes procuram `/show password/i` |
| 0.4.4 | #48 | `PinInput`: `groupLabel`, `digitLabel(n)`, `autoComplete`, `id`, `aria-describedby`; código colado no primeiro campo é distribuído | Rótulos "PIN digit N" em inglês e testes com `/pin digit/i`; sem preenchimento automático do código de 2FA |
| 0.4.5 | #49 | `Carousel`: `label`, `slideLabel`, `slideRoleDescription`, `previousLabel`, `nextLabel`, `dotLabel` | Rótulos "Slide 1 of 2", "Next slide" e "Go to slide N" em inglês |
| 0.4.6 | #50 | `Navbar`: `logoAlign="center"` | `<header>` nativo no `AuthShell` |
| 0.4.7 | #51 | `FormField`: `aria-describedby` só aponta para o erro quando há `hint` e `error` | Nenhuma (nenhum teste do app depende disso) |

O CHANGELOG não pede nenhum ajuste obrigatório nessas versões.

---

## 1. Problemas encontrados

- **P1** — `package.json:16`: `"base-ds": "npm:@indianous/base-ds@^0.4.0"`. O Dependabot não resolve o alias.
- **P2** — **254 arquivos** importam `from 'base-ds'` (dois deles com aspas duplas:
  `components/product/ProductCard.tsx:3` e `components/analytics/FunnelChart.tsx:3`). Nenhum teste faz
  `vi.mock('base-ds')`, então a troca é só nos imports.
- **P3** — `app/globals.css:2` (`@import "base-ds/styles/v4"`) e `:10`
  (`@source "../node_modules/base-ds/dist"`), além dos comentários das linhas 5–16. Com o nome com escopo, o
  pacote passa a ficar em `node_modules/@indianous/base-ds`, e o `@source` antigo deixaria de achar as classes
  usadas só dentro do base-ds (o Tailwind v4 não varre `node_modules` sozinho).
- **P4** — `__tests__/base-ds-dependency.test.ts`: **exige** o alias
  (`pkg.dependencies['base-ds']` e `lock.packages['node_modules/base-ds']`).
- **P5** — `.github/dependabot.yml`: o `allow` lista os dois nomes "porque não se sabe qual deles ele
  reconhece". Com a troca, fica só `@indianous/base-ds`.
- **P6** — `PasswordInput` sem rótulos em português em 7 formulários (`LoginForm`, `RegisterForm`,
  `ChangePasswordForm`, `ResetPasswordForm`, `EmployeeForm`, `CheckoutAuth`, `MfaDisableForm`). O leitor de
  tela anuncia "Show password", e `ResetPasswordForm.test.tsx` procura por `/show password/i`.
- **P7** — `PinInput` em `MfaCodeForm` e `MfaDisableForm`: rótulos em inglês, sem
  `autoComplete="one-time-code"` e sem `id`, então o `<label>` do `FormField` aponta para um id que não
  existe. Cinco testes procuram `/pin digit/i` (`MfaCodeForm`, `MfaSetupPanel`, `SecuritySection`,
  `CheckoutAuth` e a página de login).
- **P8** — `Carousel` em `ProductCarousel` e `BannerCarousel`: rótulos em inglês, e
  `ProductCarousel.test.tsx` procura `/slide/i`, `/next slide/i` e `/go to slide/i`.
- **P9** — `components/layout/AuthShell.tsx:14-19`: `<header>` nativo no lugar do `Navbar`.
- **P10** — Documentação com o alias: `.claude/CLAUDE.md` da raiz (seção "Design system (base-ds)",
  linhas 129–140: instalação por alias, `node_modules/base-ds/...` e `npm outdated base-ds`). O arquivo está
  no `.gitignore` da raiz, então a atualização é só local. O `README.md` da raiz já cita o nome com escopo.

---

## 2. Testes a incluir/alterar

### `__tests__/base-ds-dependency.test.ts` (alterar)

- `pkg.dependencies['@indianous/base-ds']` é uma versão semver (`^0.4.7` ou acima), nunca `file:` nem `npm:`.
- `pkg.dependencies['base-ds']` não existe mais.
- `lock.packages['node_modules/@indianous/base-ds'].resolved` começa com `https://npm.pkg.github.com/`.
- Novo: nenhum arquivo `.ts`/`.tsx`/`.css` do app importa `'base-ds'` (varre `app`, `components`,
  `contexts`, `lib`, `stores`, `types` e `__tests__`), para o nome antigo não voltar num arquivo novo.
- Novo: o `.github/dependabot.yml` só libera `@indianous/base-ds`.

### `PasswordInput` (P6)

- `components/forms/__tests__/ResetPasswordForm.test.tsx`: o botão é "Mostrar senha" e, depois de clicar,
  "Ocultar senha".
- Os testes de página que usam os outros formulários não mudam: nenhum procura o botão de mostrar senha.

### `PinInput` (P7)

- `components/forms/__tests__/MfaCodeForm.test.tsx`:
  - os 6 campos se chamam "Dígito 1" … "Dígito 6", dentro do grupo "Código de 6 dígitos";
  - o primeiro campo tem `autoComplete="one-time-code"` e o id `mfa-code`, e clicar no rótulo foca ele;
  - colar ou preencher "123456" de uma vez no primeiro campo envia o código (novo comportamento da 0.4.4).
- `MfaSetupPanel`, `SecuritySection`, `CheckoutAuth`, página de login: as buscas por `/pin digit/i` passam a
  `/dígito/i`.
- `MfaDisableForm` é testado via `SecuritySection` (`within(dialog)`): o código no Dialog também é achado
  por `/dígito/i`, e o grupo tem o nome "Código do app autenticador".

### `Carousel` (P8)

- `components/product/__tests__/ProductCarousel.test.tsx`: região "Produtos relacionados", páginas
  "Página 1 de 2", setas "Anterior"/"Próxima" e pontos "Ir para a página N".
- `BannerCarousel`: região "Banners", slides "Banner N de M", setas "Banner anterior"/"Próximo banner" e
  pontos "Ir para o banner N", em `components/site/__tests__/BannerCarousel.test.tsx`.

### `AuthShell` (P9)

- `app/(auth)/__tests__/layout.test.tsx` não muda: o `banner` continua com um link só (o logo, para `/`),
  centralizado. Ajuste só no teste de centralização, que hoje confere a classe `justify-center` do `<div>` do
  header nativo e passa a conferir que o logo está no `banner` do `Navbar` sem ações nem busca.

### Regressão

- `npm test`, `npx tsc --noEmit`, lint dos arquivos tocados e `npm run build`.
- `grep -rn "'base-ds'\|\"base-ds\"\|base-ds/" --include=*.ts --include=*.tsx --include=*.css .` sem
  resultados fora de `node_modules`, `plans/` e comentários que citam issues.

---

## 3. O que entra no projeto

### Dependência e build (P1–P5)

1. `export GITHUB_PACKAGES_TOKEN=$(gh auth token)` e `npm uninstall base-ds && npm install @indianous/base-ds@^0.4.7`.
   Conferir no lock que `node_modules/base-ds` sumiu e que `node_modules/@indianous/base-ds` resolve em
   `https://npm.pkg.github.com/`.
2. Imports: `from 'base-ds'` → `from '@indianous/base-ds'` nos 254 arquivos, preservando o tipo de aspa:
   ```sh
   grep -rlE "from ['\"]base-ds['\"]" --include=*.ts --include=*.tsx app components contexts lib stores types __tests__ \
     | xargs sed -i -E "s/from (['\"])base-ds\1/from \1@indianous\/base-ds\1/"
   ```
   Commit mecânico separado do resto, para a revisão ficar fácil.
3. `app/globals.css`: `@import "@indianous/base-ds/styles/v4";`,
   `@source "../node_modules/@indianous/base-ds/dist";` e os comentários.
4. `.github/dependabot.yml`: `allow` só com `@indianous/base-ds`, e o comentário explicando que o alias não
   funcionava (base-ds#44).

### Soluções provisórias (P6–P9)

5. **`PasswordInput`**: `showLabel="Mostrar senha" hideLabel="Ocultar senha"` nos 7 formulários.
6. **`PinInput`** em `MfaCodeForm` e `MfaDisableForm`: `id` igual ao do `FormField`, `groupLabel` com o
   mesmo texto do rótulo (o CHANGELOG pede isso: o `digitLabel` tem prioridade sobre o `<label>`),
   `digitLabel={(n) => \`Dígito ${n}\`}` e `autoComplete="one-time-code"`.
7. **`Carousel`**: rótulos em português nos dois usos, com `slideRoleDescription` ("página" nos
   relacionados, "banner" na home), que o leitor de tela lê junto com o rótulo de cada slide.
8. **`AuthShell`**: volta para `<Navbar logo={<StoreLogo />} logoAlign="center" />`, sem ações.

### Documentação

9. `.claude/CLAUDE.md` da raiz (local): instalação pelo nome com escopo,
   `node_modules/@indianous/base-ds/dist/index.d.ts` e `README.md`, `npm outdated @indianous/base-ds`, e uma
   linha dizendo que o Dependabot abre o PR de versão nova do base-ds toda semana.
10. Comentar na issue #24 com o commit e o resultado, e fechá-la. Comentar na indianous/base-ds#44 que o alias
    não funciona com o Dependabot e o nome com escopo resolve, para o base-ds atualizar o README (a issue é
    do base-ds; quem fecha é o mantenedor de lá).

### Verificação

- `npm test`, `npx tsc --noEmit`, lint e `npm run build`. Subir o ambiente completo.
- O usuário confere no navegador:
  - a loja, o painel e o login com os estilos de sempre (nada sem cor ou sem espaçamento, o que indicaria o
    `@source` errado);
  - o botão de mostrar senha no login;
  - o 2FA no login: o gerenciador de senhas ou o celular oferecem preencher o código, e colar o código
    inteiro no primeiro campo funciona;
  - os produtos relacionados e os banners da home navegando como antes;
  - o logo centralizado no login.
- Depois do push: em **Insights → Dependency graph → Dependabot**, "Check for updates" termina sem erro. Com o
  lock já na versão mais nova, ele não abre PR; o PR aparece na próxima versão publicada do base-ds.

### Fora do escopo

- Liberar o Dependabot para as outras dependências (tirar o `allow`). Fica como decisão separada, porque
  abriria PRs de todas as bibliotecas de uma vez.

---

## Notas da implementação

- **Dependência**: `@indianous/base-ds@^0.4.7`, lock resolvido em `npm.pkg.github.com`; o
  `package-lock.json` só mudou nas linhas do base-ds. O teste de dependência passou a barrar qualquer
  `'base-ds'` entre aspas (import, `require.resolve`, `vi.mock`) e o caminho `node_modules/base-ds`, e pegou um
  uso que o `sed` de imports não cobria: `require.resolve('base-ds')` em `__tests__/base-ds-single-react.test.tsx`.
- **`@source` do Tailwind**: conferido no CSS gerado pelo build que as classes do base-ds continuam lá.
- **Carrosséis viraram componentes de cliente** (`'use client'` em `ProductCarousel` e `BannerCarousel`).
  `slideLabel` e `dotLabel` são funções, e um componente de servidor não pode passar função para o `Carousel`
  (de cliente). Os testes não pegam essa fronteira; o `npm run build` pegou na home (pré-renderizada). A
  página do produto não é pré-renderizada e quebraria só em execução.
- **`getByLabelText(/senha/i)`**: com o `aria-label` "Mostrar senha" no botão, essa busca passou a achar dois
  elementos. As 28 buscas assim (página de login, `LoginForm`, `CheckoutAuth`, `SecuritySection`) viraram
  `/^senha$/i`. O plano dizia que os testes de página não mudariam; mudaram só nisso.
- **`digitLabel`** é exportado do `MfaCodeForm` e reaproveitado no `MfaDisableForm`.
- **Commits**: a troca mecânica (dependência, imports, CSS, Dependabot e o teste de dependência) vai num
  commit separado da limpeza das soluções provisórias, como previsto.
- **Testes intermitentes**: na suíte completa, às vezes falha um teste que passa isolado
  (`orders.page.test.tsx` e `OrdersContent.test.tsx`). Já aconteceu antes deste plano (etapa 9 do plano 66),
  sem relação com a troca. Fica para investigar à parte.
- **Lint**: os avisos nos arquivos tocados (`set-state-in-effect`, variáveis sem uso, `<img>`) já existiam; a
  troca só mudou a linha de import desses arquivos.
