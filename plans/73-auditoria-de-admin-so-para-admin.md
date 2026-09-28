# 73 — Trilha de auditoria de administrador só para administrador — frontend

Resolve, junto com o backend, a issue **#16** do `ecommerce-backend`. Plano irmão:
`backend/plans/73-auditoria-de-admin-so-para-admin.md`. O backend passa a responder 403 quando um funcionário
pede a trilha de auditoria de um administrador.

## Contexto

No painel da equipe, o detalhe de uma pessoa da equipe (`EmployeeFuncionarioDetailContent`) busca a trilha e,
se a resposta não for 2xx, mostra a lista vazia: "Nenhuma ação registrada.". Com a mudança no backend, um
funcionário que abre um admin veria essa frase, que dá a entender que o admin não fez nada.

O detalhe do painel do admin (`EmployeeDetailContent`) não muda: o admin continua recebendo a trilha.

### Decisões

| Situação | Comportamento |
| --- | --- |
| Funcionário abrindo um **admin** | A tela nem pede a trilha. No lugar da lista, mostra "A auditoria de administradores só é visível para administradores." |
| Funcionário abrindo outro funcionário | Como hoje |
| Admin | Como hoje |

## 1. Problemas encontrados

| Arquivo | Linha | Diagnóstico |
| --- | --- | --- |
| `components/content/dashboard/people/EmployeeFuncionarioDetailContent.tsx` | 31–41 | Pede a trilha de qualquer alvo e trata a recusa como lista vazia |
| `components/content/dashboard/people/EmployeeFuncionarioDetailContent.tsx` | seção "Histórico de Ações" | "Nenhuma ação registrada." aparece também quando a trilha não pôde ser lida |

## 2. Testes a incluir/alterar

### `app/(employee)/__tests__/employee.funcionario.detalhe.page.test.tsx` (alterar)

1. Funcionário abrindo um admin → mostra o aviso, não mostra "Nenhuma ação registrada." e não chama
   `GET /api/admin/employees/:id/audit-logs`.
2. Funcionário abrindo outro funcionário → lista de ações como hoje (o teste atual continua).

## 3. O que entra no projeto

`EmployeeFuncionarioDetailContent.tsx`: busca primeiro o funcionário. Só pede a trilha se o alvo não for ADMIN
ou se quem está logado for ADMIN. Se o alvo for ADMIN e quem vê não for, a seção "Histórico de Ações" mostra o
aviso no lugar da lista.

## O que o usuário verifica

1. Logado como funcionário com `MANAGE_EMPLOYEES`, abrir um administrador na lista da equipe: a seção
   "Histórico de Ações" mostra o aviso.
2. Abrir outro funcionário: o histórico aparece normalmente.
3. Como admin, o detalhe de qualquer pessoa da equipe continua com o histórico.
