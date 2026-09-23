# 64 — Senha (definição e recuperação) e verificação de e-mail — frontend

Plano irmão: `backend/plans/64-senha-e-verificacao-de-email.md`. Ele cria os
tokens, as rotas `/auth/forgot-password`, `/auth/password-tokens/{token}`,
`/auth/reset-password`, `/auth/verify-email` e `/auth/verify-email/resend`, o
bloqueio de pedido para e-mail não verificado, o convite pelo painel e os campos
`passwordSet`/`emailVerified`, e registra as decisões (validade, não revelar
contas, sessões encerradas, o que a conta não verificada pode fazer). Este lado
depende dele para funcionar de ponta a ponta. Os testes daqui usam MSW e podem
ser escritos antes.

## Contexto

Hoje o site só oferece "trocar senha" para quem está logado e sabe a atual, e
não confirma o e-mail de ninguém. Este plano cria:

- **"Esqueci minha senha"**: link no login → e-mail → página para escolher a
  senha nova;
- **"Definir senha"**: a mesma página, aberta pelo convite, para quem teve a conta
  criada pela equipe (funcionário, admin ou o cliente do plano 63);
- **"Confirmar e-mail"**: página aberta pelo link enviado no cadastro (ou depois
  de trocar o e-mail no perfil), um aviso para quem ainda não confirmou e o
  bloqueio no checkout;
- no painel, **cadastro de funcionário e admin sem senha** (vai o convite), o
  botão **"Enviar link de senha"** e a informação de e-mail confirmado nos detalhes
  de cliente, funcionário e admin.

**Regra decidida no plano do backend:** a conta não verificada entra, navega e
monta carrinho, mas **não fecha pedido**. As contas que já existem ficam
verificadas pela migration.

### Contrato da API (definido no plano do backend)

| Método e rota | Corpo | Resposta |
| --- | --- | --- |
| `POST /auth/register` | igual a hoje | igual · novo `409 { code: "PASSWORD_NOT_SET", message }` |
| `POST /auth/forgot-password` | `{ email }` | `204` sempre · `429` |
| `GET /auth/password-tokens/{token}` | — | `200 { purpose: RESET\|SET_PASSWORD, email (mascarado), expiresAt }` · `410` |
| `POST /auth/reset-password` | `{ token, newPassword, confirmPassword }` | `204` · `400` · `410` · `429` |
| `POST /auth/verify-email` | `{ token }` | `204` · `410` · `429` (não exige login) |
| `POST /auth/verify-email/resend` | — (autenticado) | `204` |
| `GET /users/me` | — | novo `emailVerified` |
| `PATCH /users/me` | igual a hoje | trocar o e-mail volta `emailVerified` para `false` |
| `POST /orders` | igual a hoje | novo `403 { code: "EMAIL_NOT_VERIFIED", message }` |
| `POST /admin/users/{id}/password-invite` | — | `204` · `403` · `404` |
| `POST /admin/employees` e `/admin/admins` | `password` opcional | igual a hoje |
| Cliente, funcionário e admin no painel | — | novos `passwordSet` e `emailVerified` |

Os links dos e-mails apontam para `${FRONTEND_URL}/reset-password?token=<token>`
e `${FRONTEND_URL}/verify-email?token=<token>`.

---

## 1. Problemas encontrados

- **F1** — `app/(auth)/` só tem `login` e `register`. Não há página para pedir a
  recuperação, escolher a senha a partir de um link ou confirmar o e-mail.
- **F2** — `components/forms/LoginForm.tsx`: sem o link "Esqueci minha senha".
- **F3** — `stores/auth.store.ts` (`postAuth`): transforma qualquer erro em
  `new Error(message)` e descarta o `code`. O cadastro não consegue distinguir o
  `409 PASSWORD_NOT_SET` ("enviamos um link para você definir sua senha") do
  `409` comum ("e-mail já cadastrado").
- **F4** — `types/index.ts` (`User`): sem `emailVerified`, então nada na loja sabe
  se deve avisar ou bloquear.
- **F5** — O checkout (`CheckoutContent`/`CheckoutForm`) só descobriria o bloqueio
  no clique final, com um erro genérico. O cliente precisa ver antes, com o botão
  de reenviar.
- **F6** — `CustomerProfileContent` + `ProfileDataForm`: o e-mail é editável, e o
  perfil não avisa que trocar o e-mail exige confirmar o novo.
- **F7** — `components/forms/EmployeeForm.tsx:18-20,42-45`: senha obrigatória
  (`password.length >= 8` no `canSubmit`). Ele também foge das convenções: tem
  `useState` próprio e usa `<label>`/`<input>` nativos em vez de `FormField`/
  `PasswordInput`, e não tem teste próprio. Como o plano mexe exatamente no campo
  de senha, ele vira um form puro controlado neste plano.
- **F8** — `CustomerDetailContent`, `EmployeeFuncionarioDetailContent`/
  `EmployeeDetailContent` e `AdminsContent`: sem a informação "senha ainda não
  definida" ou "e-mail não confirmado" nem ação para enviar o link.
- **F9** — Os tokens vão na URL (`?token=`). Sem cuidado, eles vazam no cabeçalho
  `Referer` de qualquer recurso externo carregado na página, e ficam na barra e no
  histórico.

---

## 2. Testes a incluir/alterar

### BFF

- `app/api/auth/forgot-password/__tests__/route.test.ts`: repassa o e-mail e o
  `X-Forwarded-For` (`forwardedForHeader`, como o login), e devolve 204 e 429.
- `app/api/auth/password-tokens/[token]/__tests__/route.test.ts`: repassa o token
  e devolve 200 e 410.
- `app/api/auth/reset-password/__tests__/route.test.ts`: repassa o corpo e o IP.
  Não grava cookie de sessão (não há login automático).
- `app/api/auth/verify-email/__tests__/route.test.ts`: repassa o token e o IP;
  204 e 410.
- `app/api/auth/verify-email/resend/__tests__/route.test.ts`: repassa o
  `Authorization`.
- `app/api/admin/users/[id]/password-invite/__tests__/route.test.ts`: repassa o
  `Authorization`.

### `components/forms/__tests__/ForgotPasswordForm.test.tsx` (novo)

- E-mail inválido → erro e o botão desabilitado.

### `components/forms/__tests__/ResetPasswordForm.test.tsx` (novo)

- Menos de 8 caracteres → erro. Confirmação diferente → erro. As duas certas →
  botão habilitado. Usa `PasswordInput` (mostrar/ocultar).

### `app/(auth)/__tests__/forgot-password.page.test.tsx` (novo)

- Enviar → `POST /api/auth/forgot-password` → a tela troca para "Se houver uma
  conta com este e-mail, enviamos um link. Ele vale por 1 hora." A **mesma**
  mensagem para qualquer e-mail (o backend sempre dá 204).
- 429 → "Muitas tentativas. Tente de novo em alguns minutos."
- Link "Voltar para o login".

### `app/(auth)/__tests__/reset-password.page.test.tsx` (novo)

- Sem `token` na URL → estado "Link inválido" com o link para `/forgot-password`.
- Carrega `GET /api/auth/password-tokens/:token`:
  - `RESET` → título "Redefinir senha";
  - `SET_PASSWORD` → título "Definir sua senha" e um texto de boas-vindas;
  - nos dois, mostra o e-mail mascarado;
  - 410 → "Este link expirou ou já foi usado" + botão para pedir outro.
- Enviar → `POST /api/auth/reset-password` → redireciona para
  `/login?passwordReset=1`.
- 400 → mensagem do backend no form. 410 no envio → o estado de link expirado.
- Depois de ler o token, a URL é limpa com `router.replace('/reset-password')` e
  o token fica só em memória (F9).

### `app/(auth)/__tests__/verify-email.page.test.tsx` (novo)

- Com `token`: chama `POST /api/auth/verify-email` ao montar, uma vez só (mesmo no
  StrictMode) → "E-mail confirmado".
  - Logado: atualiza o `user` do store (`emailVerified: true`) e oferece
    "Continuar comprando" / "Ir para o checkout" se houver itens no carrinho.
  - Deslogado: botão "Entrar".
- 410 → "Este link expirou ou já foi usado". Logado: botão "Enviar outro link"
  (`resend`). Deslogado: "Entre para pedir outro link".
- Sem `token` → "Link inválido".
- A URL é limpa depois de ler o token (F9).

### `components/layout/__tests__/EmailVerificationBanner.test.tsx` (novo)

- Cliente logado com `emailVerified = false` → aviso "Confirme seu e-mail
  <e-mail> para poder finalizar pedidos" + "Reenviar e-mail".
- Reenviar → `POST /api/auth/verify-email/resend` → toast "Enviamos um novo
  link" e o botão fica desabilitado por 60 s.
- Verificado, deslogado, funcionário ou admin → não aparece.

### `app/(customer)/__tests__/checkout.page.test.tsx` (alterar)

- Cliente não verificado → no lugar do botão "Finalizar pedido", um `Card` "Confirme
  seu e-mail para finalizar" com "Reenviar e-mail". Endereço, frete e resumo
  continuam visíveis.
- Se o `POST /api/orders` ainda assim devolver `403 EMAIL_NOT_VERIFIED` (por
  exemplo, o e-mail foi trocado em outra aba), o checkout mostra o mesmo `Card`,
  sem toast genérico e sem redirecionar.
- Verificado → igual a hoje.

### `app/(customer)/__tests__/profile.page.test.tsx` e `ProfileDataForm.test.tsx` (alterar)

- Com o e-mail alterado no form, aparece a dica "Você vai precisar confirmar o
  novo e-mail antes do próximo pedido".
- Salvar com e-mail novo → toast "Enviamos um link para <novo e-mail>" e o store
  fica `emailVerified: false` (o aviso aparece).

### `app/(auth)/__tests__/metadata.test.ts` (alterar)

- As três páginas novas exportam `metadata` com título,
  `referrer: 'no-referrer'` (F9) e `robots: { index: false }`.

### `app/(auth)/__tests__/login.page.test.tsx` (alterar)

- Link "Esqueci minha senha" para `/forgot-password`.
- `?passwordReset=1` → aviso "Senha alterada. Entre com a nova senha."

### `app/(auth)/__tests__/register.page.test.tsx` e `stores/__tests__/auth.store.test.ts` (alterar)

- Cadastro com sucesso → toast "Enviamos um link de confirmação para <e-mail>".
- `409` com `code: PASSWORD_NOT_SET` → mensagem própria ("Já existe uma conta com
  este e-mail. Enviamos um link para você definir sua senha.") com o link para o
  login. `409` sem código → a mensagem de hoje.
- `postAuth` lança um `AuthError` com `status` e `code`, e `message` continua
  igual para quem só lê a mensagem.
- `markEmailVerified()` no store atualiza `user.emailVerified`.

### `components/forms/__tests__/EmployeeForm.test.tsx` (novo)

O form tem validação própria.

- Nome e e-mail obrigatórios, e a senha opcional.
- `Switch` "Enviar convite por e-mail" (ligado por padrão): ligado esconde o
  campo de senha; desligado mostra o campo, que passa a exigir 8 caracteres.
- É puro: recebe `value`/`onChange`.

### `EmployeesContent.test.tsx` e `AdminsContent.test.tsx` (alterar)

- Criar com convite → `POST` sem `password` → toast "Convite enviado para <e-mail>".
- Criar com senha → `POST` com `password`, como hoje.

### Detalhes de cliente, funcionário e admin (alterar)

- `passwordSet = false` → `Badge` "Senha não definida" e o botão "Enviar convite".
  `passwordSet = true` → botão "Enviar link de redefinição".
- `emailVerified = false` → `Badge` "E-mail não confirmado".
- Clique → confirmação → `POST /api/admin/users/:id/password-invite` → toast.
- Botão só para quem pode (admin; `MANAGE_CUSTOMERS` no cliente; `MANAGE_EMPLOYEES`
  no funcionário; admin só por admin). 403 → toast com a mensagem.

### `__tests__/proxy.test.ts` (alterar)

- `/forgot-password`, `/reset-password` e `/verify-email` são públicas (sem
  redirect), inclusive para quem está logado.

---

## 3. O que entra no projeto

### Tipos

1. **`types/index.ts`**: `PasswordTokenPurpose = 'RESET' | 'SET_PASSWORD'`,
   `PasswordTokenInfo { purpose; email; expiresAt }`, `ResetPasswordInput`,
   `emailVerified: boolean` no `User`, e `passwordSet`/`emailVerified` nos tipos
   de cliente, funcionário e admin do painel.

### BFF

2. **`app/api/auth/forgot-password/route.ts`**, **`password-tokens/[token]/route.ts`**,
   **`reset-password/route.ts`** e **`verify-email/route.ts`**: proxy com
   `forwardedForHeader`, no padrão de `login/route.ts`. Sem cookies.
3. **`app/api/auth/verify-email/resend/route.ts`** e
   **`app/api/admin/users/[id]/password-invite/route.ts`** (`POST`, repassando o
   `Authorization`).

### Lib e store

4. **`lib/password-policy.ts`**: `MIN_PASSWORD_LENGTH = 8` e
   `passwordErrors(password, confirm)`, usados pelo `RegisterForm`, pelo
   `ChangePasswordForm`, pelo `ResetPasswordForm` e pelo `EmployeeForm`, para as
   quatro regras não divergirem.
5. **`stores/auth.store.ts`**: `postAuth` lança `AuthError { status, code, message }`
   (F3), e o store ganha `markEmailVerified()`.

### Componentes

6. **`components/forms/ForgotPasswordForm.tsx`** e **`ResetPasswordForm.tsx`**
   (novos, puros): `FormField` + `Input`/`PasswordInput` + `Button`.
7. **`components/content/auth/ForgotPasswordContent.tsx`**,
   **`ResetPasswordContent.tsx`** e **`VerifyEmailContent.tsx`** (novos):
   `<Container width="sm" spacing="loose">`, como login e cadastro. Os dois com
   token leem o token, limpam a URL, guardam o token em estado e tratam os estados
   (carregando, válido, expirado, concluído). O de verificação usa uma `ref` para
   não chamar o backend duas vezes no StrictMode.
8. **`components/layout/EmailVerificationBanner.tsx`** (novo): aviso no topo do
   `AppShell` para cliente não verificado, com o reenvio. Usa o `Alert` do base-ds
   (`variant="warning"`, `layout="full"`, `actions` com o botão "Reenviar e-mail"),
   criado em [indianous/base-ds#45](https://github.com/indianous/base-ds/issues/45)
   e disponível desde a v0.4.2.
9. **Checkout**: `CheckoutContent`/`CheckoutForm` mostram o `Card` de "Confirme
   seu e-mail" no lugar do botão de finalizar, e tratam o `403 EMAIL_NOT_VERIFIED`
   do pedido (F5).
10. **Perfil**: `ProfileDataForm` mostra a dica quando o e-mail difere do atual, e
    o `CustomerProfileContent` trata a volta para não verificado (F6).
11. **`LoginContent`/`LoginForm`**: o link "Esqueci minha senha" e o aviso de
    `passwordReset=1`.
12. **`RegisterContent`**: o toast de verificação enviada e a mensagem do
    `PASSWORD_NOT_SET`.
13. **`components/forms/EmployeeForm.tsx`**: vira puro e controlado, com
    `FormField`, `Input`, `PasswordInput` e o `Switch` do convite (F7).
    `EmployeesContent` e `AdminsContent` passam a guardar o estado.
14. **`components/admin/PasswordInviteButton.tsx`** (novo): `Button` + confirmação
    + chamada + toast, recebendo `userId`, `passwordSet` e `canInvite`. Usado nos
    três detalhes, junto dos `Badge`s de F8.

### Páginas

15. **`app/(auth)/forgot-password/page.tsx`**, **`app/(auth)/reset-password/page.tsx`**
    e **`app/(auth)/verify-email/page.tsx`**: só renderizam o content, com
    `metadata` (título, `referrer: 'no-referrer'`, `robots: { index: false }`).
    Ficam no layout de `(auth)`, que já tem o `Suspense` para o `useSearchParams`.
16. **`proxy.ts`**: nada muda. As rotas novas não estão no `matcher`, então já são
    públicas; o teste só confirma.

### Verificação

- `npm test`, `npx tsc --noEmit`, lint dos arquivos tocados e `npm run build`
  (o plano cria rotas novas).
- Com o backend do plano irmão no ar, subir o ambiente completo. Sem SMTP, os
  links saem no log do backend. O usuário confere:
  - cadastro novo: aviso de e-mail não confirmado, checkout bloqueado com o
    reenvio, link do log confirmando e o checkout liberado;
  - uma conta antiga continua comprando sem confirmar nada;
  - trocar o e-mail no perfil: o aviso volta e o checkout bloqueia até confirmar;
  - "Esqueci minha senha" com um e-mail existente e um inexistente (mesma
    mensagem), o link do log, a troca e o login com a senha nova;
  - abrir o mesmo link de novo (expirado/usado);
  - criar um funcionário com convite, abrir o link, ver "Definir sua senha" e entrar;
  - "Enviar link de redefinição" no detalhe de um cliente;
  - que a sessão aberta em outro navegador cai depois da troca de senha.
