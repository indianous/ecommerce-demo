# 65 — Autenticação em dois fatores (2FA) — frontend

Plano irmão: `backend/plans/65-autenticacao-em-dois-fatores.md`. Ele cria o
login em duas etapas, o `mfaToken`, a configuração, os códigos de recuperação,
o reset pelo painel e a obrigatoriedade para a equipe, e registra as decisões.
Este lado depende dele para funcionar de ponta a ponta. Os testes daqui usam MSW
e podem ser escritos antes.

## Contexto

Hoje o login tem uma etapa só: e-mail + senha → sessão. Com o plano, **admin e
funcionário são obrigados** a usar um app autenticador (TOTP), e o cliente pode
ativar no perfil. O login passa a ter até três resultados, e a tela precisa
guiar cada um:

1. **Sessão direta**: cliente sem 2FA, como hoje.
2. **Pedir o código**: conta com 2FA ativo. Digitar o código de 6 dígitos do app,
   ou um código de recuperação.
3. **Configurar agora**: admin ou funcionário sem 2FA. Ler o QR code, confirmar
   um código, guardar os códigos de recuperação e só então entrar.

### Contrato da API (definido no plano do backend)

| Método e rota | Corpo | Resposta |
| --- | --- | --- |
| `POST /auth/login` | igual a hoje | sessão (igual a hoje) · `{ mfaRequired: true, mfaToken }` · `{ mfaSetupRequired: true, mfaToken }` |
| `POST /auth/mfa/verify` | `{ mfaToken, code }` ou `{ mfaToken, recoveryCode }` | sessão + `recoveryCodesRemaining` · `401 { attemptsRemaining }` · `410` |
| `POST /auth/mfa/setup/start` | `{ mfaToken }` | `{ secret, otpauthUri }` · `410` |
| `POST /auth/mfa/setup/confirm` | `{ mfaToken, code }` | sessão + `recoveryCodes` · `401` · `410` |
| `POST /users/me/mfa/setup/start` | — | `{ secret, otpauthUri }` |
| `POST /users/me/mfa/setup/confirm` | `{ code, currentCode? }` | `{ recoveryCodes }` · `400` |
| `POST /users/me/mfa/recovery-codes` | `{ code }` | `{ recoveryCodes }` · `400` |
| `POST /users/me/mfa/disable` | `{ password, code }` | `204` · `400` · `403` (equipe) |
| `GET /users/me` | — | novos `mfaEnabled`, `mfaEnabledAt` e `recoveryCodesRemaining` |
| `POST /admin/users/{id}/mfa/reset` | — | `204` · `403` · `404` |
| Cliente, funcionário e admin no painel | — | novo `mfaEnabled` |

Código ou senha errados nas rotas `/users/me/mfa/*` respondem **400** (`code:
INVALID_MFA_CODE`, `INVALID_CURRENT_MFA_CODE` na troca de celular quando o errado é o
código do app atual, ou `INVALID_PASSWORD`), e não 401: o `authFetch` trata todo 401
como sessão vencida e manda para o login, então errar um dígito no perfil
deslogaria a pessoa. É o mesmo motivo de "Senha atual incorreta" ser 400. O 401
com `attemptsRemaining` fica só em `/auth/mfa/verify` e `/auth/mfa/setup/confirm`,
que são públicas e não passam pelo `authFetch`.

"Sessão" é o mesmo corpo do login de hoje (`accessToken`, `refreshToken`,
`role`…), e o BFF grava os cookies `session` e `role` do mesmo jeito.

---

## 1. Problemas encontrados

- **F1** — `app/api/auth/login/route.ts:24-39`: grava os cookies `session` e
  `role` sempre que o backend responde 200. Com o 2FA, um 200 pode não trazer
  sessão (`mfaRequired`/`mfaSetupRequired`). Gravar `session` com `undefined`
  quebraria o proxy e o refresh.
- **F2** — `stores/auth.store.ts` (`login`): assume que o login sempre termina em
  sessão (chama `fetchMe` e seta `isAuthenticated`). Não há como representar
  "falta o segundo fator".
- **F3** — `components/content/auth/LoginContent.tsx` e `LoginForm`: uma etapa
  só, e o redirecionamento acontece no `onSuccess`.
- **F4** — `components/forms/CheckoutAuth.tsx:24-25`: o checkout também faz login
  (`login({ email, password })`). Um cliente com 2FA travaria ali sem a segunda etapa.
- **F5** — Perfis (`CustomerProfileContent`, `EmployeeProfileContent`,
  `AdminProfileContent`): sem seção de segurança para ativar, reconfigurar, gerar
  códigos novos ou desativar.
- **F6** — Detalhes e listagens do painel (`CustomerDetailContent`,
  `EmployeeFuncionarioDetailContent`/`EmployeeDetailContent`, `EmployeesContent`,
  `AdminsContent`): sem o estado do 2FA nem o botão de reset.

---

## 2. Testes a incluir/alterar

### BFF

- `app/api/auth/login/__tests__/route.test.ts` (alterar): com `mfaRequired` ou
  `mfaSetupRequired`, repassa o corpo e **não grava cookie nenhum**. Com sessão,
  igual a hoje.
- `app/api/auth/mfa/verify/__tests__/route.test.ts` e
  `mfa/setup/confirm/__tests__/route.test.ts` (novos): com sucesso, gravam
  `session` e `role` com as mesmas opções do login e **não** devolvem o
  `refreshToken` no corpo. 401 e 410 repassados sem cookie.
- `mfa/setup/start` e as rotas de `/api/users/me/mfa/*`: repassam corpo e
  `Authorization`.
- `app/api/admin/users/[id]/mfa/reset/__tests__/route.test.ts`: repassa o `Authorization`.
- Um helper compartilhado `setSessionCookies` (ver seção 3) com teste próprio,
  usado por login, cadastro, refresh e as duas rotas novas.

### `stores/__tests__/auth.store.test.ts` (alterar)

- `login` devolve `{ status: 'authenticated' }`, `{ status: 'mfaRequired' }` ou
  `{ status: 'mfaSetupRequired' }`. Nos dois últimos, `isAuthenticated` continua
  `false` e o `mfaToken` fica só em memória no store (fora do `persist`, fora do
  `localStorage`).
- `verifyMfa(code)` e `verifyRecoveryCode(code)`: com sucesso, sessão como no
  login, `fetchMe` e `mfaToken` limpo. 401 → erro com `attemptsRemaining`. 410 →
  `mfaToken` limpo e erro "sessão de login expirou".
- `startMfaSetup()` e `confirmMfaSetup(code)`: o segundo devolve os
  `recoveryCodes`, mas só marca `isAuthenticated` depois de
  `acknowledgeRecoveryCodes()` (ver o fluxo abaixo).
- `cancelMfa()` limpa o `mfaToken`.

### `components/forms/__tests__/MfaCodeForm.test.tsx` (novo)

Tem validação própria.

- `PinInput` do base-ds com 6 dígitos, e envio automático no `onComplete`.
- Só aceita dígitos.
- Link "Usar um código de recuperação" troca para um `Input` no formato
  `XXXX-XXXX` (normaliza maiúsculas, aceita sem o hífen).
- Mostra "N tentativas restantes" quando recebe `attemptsRemaining`.

### `components/auth/__tests__/MfaSetupPanel.test.tsx` (novo)

- Mostra o QR code (`QrCode` do base-ds com o `otpauthUri`), a chave em texto em
  grupos de 4 com `CopyButton`, e os passos "1. Instale um app autenticador;
  2. Leia o QR code; 3. Digite o código".
- Confirmar com código válido → chama `onConfirmed(recoveryCodes)`.

### `components/auth/__tests__/RecoveryCodesPanel.test.tsx` (novo)

- Lista os 10 códigos, com "Copiar todos" e "Baixar .txt" (`downloadBlob`, que já existe).
- O botão "Continuar" só habilita depois do `Checkbox` "Guardei os códigos em um
  lugar seguro".
- Aviso: "Estes códigos não serão mostrados de novo."

### `app/(auth)/__tests__/login.page.test.tsx` (alterar)

- Cliente sem 2FA → igual a hoje (regressão, inclusive `callbackUrl` e
  `postLoginPath` do plano 59).
- `mfaRequired` → a tela troca para "Digite o código do seu app autenticador",
  com o e-mail mostrado e "Voltar". Código certo → redireciona pelo
  `postLoginPath`. Código errado → erro com as tentativas restantes. 410 → volta
  para a etapa de senha com "Sua sessão de login expirou, entre de novo".
- Código de recuperação → entra, e se `recoveryCodesRemaining <= 3` mostra um
  toast "Restam N códigos de recuperação — gere novos no seu perfil".
- `mfaSetupRequired` (funcionário) → "Para proteger o painel, configure a
  verificação em duas etapas" → `MfaSetupPanel` → `RecoveryCodesPanel` → entra no
  `/dashboard`. Não dá para pular: "Voltar" encerra a tentativa de login.
- A etapa do código não mostra os campos de senha, e o `mfaToken` não vai para a URL.

### `components/forms/__tests__/CheckoutAuth.test.tsx` (alterar)

- Cliente com 2FA fazendo login no checkout → aparece o `MfaCodeForm` no lugar
  do form. Código certo → continua o checkout, sem sair da página.

### `components/profile/__tests__/SecuritySection.test.tsx` (novo)

- **Cliente sem 2FA:** "Verificação em duas etapas: desativada" + "Ativar" →
  `MfaSetupPanel` → `RecoveryCodesPanel` → "Ativada".
- **Com 2FA:** "Ativada desde <data>", "Códigos de recuperação restantes: N",
  "Gerar novos códigos" (pede um código do app), "Trocar de celular" (pede o
  código do app atual e depois o do novo).
- **Desativar** (só cliente): Dialog com senha + código → `POST /users/me/mfa/disable` → toast.
- **Admin/funcionário:** não mostra "Desativar", e mostra o texto "Obrigatória
  para a equipe".

### Perfis (alterar)

- `CustomerProfileContent`, `EmployeeProfileContent` e `AdminProfileContent`
  renderizam a `SecuritySection`.

### Painel (alterar)

- Listagens de funcionários e admins: coluna "2FA" com `Badge` Ativo/Pendente.
- Detalhes de cliente, funcionário e admin: `Badge` do estado e o botão "Resetar
  2FA" (confirmação explicando que as sessões serão encerradas e que a pessoa
  vai configurar de novo no próximo login) → `POST` → toast.
- O botão só aparece para quem pode: admin (e não no próprio perfil); no
  cliente, também quem tem `MANAGE_CUSTOMERS`.

---

## 3. O que entra no projeto

### Tipos

1. **`types/index.ts`**: `LoginResult = { status: 'authenticated' } | { status: 'mfaRequired' } | { status: 'mfaSetupRequired' }`,
   `MfaSetupInfo { secret; otpauthUri }`, `mfaEnabled`/`recoveryCodesRemaining`
   no `User`, e `mfaEnabled` nos tipos de cliente, funcionário e admin do painel.

### BFF

2. **`lib/session-cookies.ts`** (novo): `setSessionCookies(cookieStore, data)` com
   as opções que hoje estão repetidas em `login`, `register` e `refresh`. As três
   rotas passam a usar o helper.
3. **`app/api/auth/login/route.ts`**: só grava cookies quando a resposta traz
   `refreshToken` (F1).
4. **`app/api/auth/mfa/verify/route.ts`**, **`mfa/setup/start/route.ts`** e
   **`mfa/setup/confirm/route.ts`** (novos), com `forwardedForHeader` e os cookies
   pelo helper nas duas que terminam em sessão.
5. **`app/api/auth/me/mfa/setup/start`** (junto do `auth/me/password` que já existe), **`setup/confirm`**,
   **`recovery-codes`** e **`disable`**.
6. **`app/api/admin/users/[id]/mfa/reset/route.ts`**.

### Store

7. **`stores/auth.store.ts`**: `login` devolve `LoginResult` e guarda o `mfaToken`
   em memória; ações `verifyMfa`, `verifyRecoveryCode`, `startMfaSetup`,
   `confirmMfaSetup`, `acknowledgeRecoveryCodes` e `cancelMfa` (F2). O `register`
   não muda (cliente novo nunca tem 2FA).

### Componentes

8. **`components/forms/MfaCodeForm.tsx`** (novo, puro): `PinInput` de 6 dígitos ou
   `Input` de código de recuperação, com `FormField` e `Button`.
9. **`components/auth/MfaSetupPanel.tsx`** e **`RecoveryCodesPanel.tsx`** (novos):
   `Card`, `QrCode`, `CopyButton`, `Checkbox` e `Button` do base-ds.
10. **`components/content/auth/LoginContent.tsx`**: etapas `credentials` →
    `mfa` | `setup` → `recoveryCodes` → redireciona pelo `postLoginPath`. O
    `LoginForm` continua só com e-mail e senha (F3).
11. **`components/forms/CheckoutAuth.tsx`**: trata `mfaRequired` com o
    `MfaCodeForm` (F4). `mfaSetupRequired` não acontece no checkout (é só da
    equipe), mas, se vier, mostra "Entre pelo login da equipe" com o link.
12. **`components/profile/SecuritySection.tsx`** (novo), usado nos três perfis (F5).
13. **`components/admin/MfaResetButton.tsx`** (novo) e os `Badge`s de estado nas
    listagens e nos detalhes (F6).

### Páginas

14. Nenhuma página nova: tudo acontece no `/login` e nos perfis que já existem.
    O `proxy.ts` não muda, porque o cookie `role` só é gravado depois da sessão
    completa.

### Verificação

- `npm test`, `npx tsc --noEmit`, lint dos arquivos tocados e `npm run build`.
- Com o backend do plano irmão no ar, subir o ambiente completo. O usuário
  confere, com um app autenticador no celular:
  - login de funcionário sem 2FA → configuração obrigatória, QR code, códigos de
    recuperação e entrada no painel;
  - logout e login de novo → pede o código; errar até esgotar as tentativas;
  - entrar com um código de recuperação e ver o aviso;
  - cliente ativando e desativando no perfil, e fazendo login no checkout com 2FA;
  - admin resetando o 2FA de um funcionário (a sessão dele cai e ele configura de
    novo no próximo login);
  - uma sessão de funcionário aberta antes do deploy cai no próximo refresh.

---

## Notas da implementação

- **Rotas do BFF do perfil** ficaram em `app/api/auth/me/mfa/*`, ao lado do `auth/me/password` que já existia.
- **`MfaSetupPanel.onConfirm`** devolve `Promise<void>`: o pai decide o que vem depois (códigos de recuperação
  no login; pedir o código do app atual na troca de celular).
- **Troca de celular**: primeiro o QR code do app novo e o código dele, **depois** o código do app atual. Pedir
  o atual antes faria ele vencer (janela de ~30–90 s) enquanto a pessoa lê o QR code. Se o código novo vencer
  nesse meio-tempo, a tela volta ao QR code com o aviso.
- **Tentativas esgotadas**: com `attemptsRemaining: 0` o login (e o checkout) já volta para a senha, sem esperar
  o 410 da próxima tentativa.
- **`PinInput` do base-ds** tem `aria-label` fixo em inglês ("PIN digit N") e não aceita
  `autoComplete="one-time-code"`. Aberta a issue
  [indianous/base-ds#48](https://github.com/indianous/base-ds/issues/48); até lá, os testes procuram por
  `/pin digit/i`.
- **Estado do 2FA no painel**: `MfaStatusBadge` ("2FA ativo", "2FA pendente" para a equipe, "2FA desativado"
  para o cliente) e coluna "2FA" (Ativo/Pendente) na tabela de funcionários e admins. O `MfaResetButton` só
  aparece com o 2FA ativo (sem 2FA não há o que resetar).
- **`CustomerProfileContent`** passou a gravar no store o usuário que carrega, para a seção de segurança
  mostrar o estado atual.
- **Auditoria**: rótulos das cinco ações novas (`MFA_*`) na listagem e no filtro.
