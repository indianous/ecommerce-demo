# 71 — Funcionário não concede permissão a si mesmo nem permissão que não tem — frontend

Resolve, junto com o backend, a issue **#14** do `ecommerce-backend`. Plano irmão:
`backend/plans/71-permissoes-sem-autoconcessao.md`. O backend passa a recusar (403) quando um funcionário altera
as próprias permissões, ou quando concede ou remove uma permissão que ele mesmo não tem. Este lado só evita
oferecer na tela o que vai ser recusado. Os testes daqui usam MSW e podem ser escritos antes.

## Contexto

A tela de detalhe do funcionário no painel da equipe (`EmployeeFuncionarioDetailContent`, rota
`/dashboard/employees/[id]`) mostra o `TransferList` com **todas** as permissões para quem tem
`MANAGE_EMPLOYEES`, inclusive quando o funcionário aberto é o próprio usuário. Com a regra nova, a tela ofereceria
ações que sempre falham, e o toast de erro é genérico ("Erro ao salvar permissões.").

O `TransferList` do base-ds não permite travar uma opção específica: só tem `disabled` para a lista inteira. A
tela contorna isso separando as permissões que o ator pode mexer das que ele não pode, sem precisar de mudança no
base-ds.

A tela do admin (`EmployeeDetailContent`) não muda: o admin pode tudo, e um admin nunca é o funcionário aberto.

### Decisões

| Situação na tela do funcionário | Comportamento |
| --- | --- |
| Funcionário abrindo o **próprio** perfil | Sem `TransferList` e sem "Salvar permissões". Mostra as permissões como `Badge`s e o aviso "Você não pode alterar as próprias permissões. Peça a um administrador." |
| Funcionário abrindo um colega | O `TransferList` tem só as permissões que **o ator tem**. As permissões do colega que o ator não tem aparecem abaixo, como `Badge`s, com o título "Outras permissões (só um administrador altera)" |
| Salvar | Envia o que está no `TransferList` **mais** as "outras permissões", que nunca saem do pedido |
| Recusa do backend | O toast mostra a mensagem que veio do backend. Se não vier mensagem, mantém o texto de hoje |

## 1. Problemas encontrados

| Arquivo | Linha | Diagnóstico |
| --- | --- | --- |
| `components/content/dashboard/people/EmployeeFuncionarioDetailContent.tsx` | 115–133 | O `TransferList` mostra todas as permissões (`ALL_PERMISSIONS`) para qualquer ator, inclusive no próprio perfil |
| `components/content/dashboard/people/EmployeeFuncionarioDetailContent.tsx` | 42–58 | Envia só o `value` do `TransferList`. O toast de erro ignora a mensagem do backend |
| `lib/permissions.ts` | — | Não há regra de "quais permissões este ator pode mexer neste alvo", como já existe para o convite e o reset de 2FA |

## 2. Testes a incluir/alterar

### `lib/__tests__/permissions.test.ts` (alterar)

1. `editablePermissions(actor, target)`: ADMIN → todas; EMPLOYEE → só as que ele tem; o próprio perfil (mesmo id) → nenhuma.
2. `canEditPermissions(actor, target)`: false no próprio perfil e para quem não tem `MANAGE_EMPLOYEES`; true para ADMIN.

### `app/(employee)/__tests__/employee.funcionario.detalhe.page.test.tsx` (alterar)

1. Ator abrindo o próprio perfil → sem `TransferList` e sem "Salvar permissões", com as permissões como Badges e o aviso.
2. Ator com `MANAGE_EMPLOYEES` e `MANAGE_ORDERS` abrindo um colega que tem `MANAGE_ORDERS` e `MANAGE_SITE` → o
   `TransferList` só oferece `MANAGE_EMPLOYEES` e `MANAGE_ORDERS`; `MANAGE_SITE` aparece em "Outras permissões".
3. Salvar nesse cenário → o PUT leva `MANAGE_SITE` junto com o que está em "Atribuídas".
4. PUT respondendo 403 com uma mensagem → o toast mostra essa mensagem.
5. Os testes atuais continuam. O fixture do usuário logado ganha as permissões que o teste de salvar precisa.

## 3. O que entra no projeto

- `lib/permissions.ts`: `canEditPermissions(actor, target)` e `editablePermissions(actor, target)`, seguindo a
  regra do backend e no estilo de `canSendPasswordInvite` e `canResetMfa`.
- `EmployeeFuncionarioDetailContent.tsx`:
  - próprio perfil (`currentUser.id === employee.id`): Badges e aviso no lugar do `TransferList` e do botão;
  - colega: `options` do `TransferList` = `editablePermissions`; `value` = permissões do colega dentro desse
    conjunto; "Outras permissões" = o resto das permissões do colega, em `Badge`;
  - `handleSave` envia `value ∪ outras`; no erro, lê o `message` do `ApiError`.
- Componentes só do base-ds (`TransferList`, `Badge`, `Heading`, `Text`). Não precisa de issue no base-ds: a
  separação em duas áreas resolve sem travar opções dentro do `TransferList`.

## O que o usuário verifica

1. Logado como funcionário com `MANAGE_EMPLOYEES`, abrir o próprio perfil em **Pessoas → Funcionários**: as
   permissões aparecem só para leitura, com o aviso.
2. Abrir um colega: a lista de disponíveis tem só as permissões que você tem. As outras do colega aparecem abaixo
   e continuam com ele depois de salvar.
3. Logado como admin, o detalhe do funcionário continua oferecendo todas as permissões.
