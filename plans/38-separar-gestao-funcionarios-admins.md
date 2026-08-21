# 38 — Separar gestão de Funcionários e Administradores (frontend)

## Contexto

Plano irmão: `backend/plans/38-separar-gestao-funcionarios-admins.md`. Como no
backend, o frontend também já tem parte da estrutura pronta — o problema real não
é "criar do zero", é que as duas páginas hoje chamam a mesma rota sem filtrar.

Este plano também se apoia em quatro planos já escritos nesta sessão, ainda não
implementados: #33 (busca só dispara no botão), #34 (filtro vira `FilterDropdown`,
estilo Excel), #36 (`useConfirmDelete`/`ConfirmDeleteDialog` compartilhados), #37
(`CopyButton` em nome/e-mail — a lista de funcionários já está no escopo dele).
Faz sentido implementar esses quatro primeiro (ou junto), senão essa refatoração
reescreve busca/filtro/exclusão de um jeito que os outros planos reescrevem nas
mesmas linhas de novo.

## 1. Problemas encontrados (estado atual real)

- `app/(employee)/dashboard/employees/EmployeesContent.tsx` **e**
  `app/(admin)/dashboard/admin/employees/EmployeesContent.tsx` chamam a **mesma
  URL**, `fetch('/api/admin/employees')`, sem `?role=` — é exatamente essa
  chamada sem filtro que mistura ADMIN e EMPLOYEE na listagem (o backend já
  filtraria certinho se o `role` fosse passado, ver plano de backend). O
  `POST` de criação também vai pra `/api/admin/employees` nos dois arquivos —
  hoje **não existe nenhuma forma de criar um admin pela UI**, mesmo o backend já
  tendo `POST /admin/admins` pronto (só não é chamado por nada no frontend).
- Não existe `app/(admin)/dashboard/admin/admins/` — a rota
  `/dashboard/admin/admins` do pedido não existe ainda.
- **`components/admin/EmployeeManagementTable.tsx` já está pronto pro caso dos
  admins sem precisar de componente novo**: `onManagePermissions` já é uma prop
  **opcional** (`onManagePermissions?: (employee: Employee) => void`), e o botão
  "Permissões" só renderiza `{onManagePermissions && (...)}`. Ou seja: a tela de
  admin só precisa **não passar** essa prop pra já ficar só com "Excluir" — não
  precisa de um componente `AdminManagementTable` separado.
- **`TransferList` de permissões já existe e já funciona** — não em modal, em
  página dedicada (`EmployeeFuncionarioDetailContent.tsx` /
  `EmployeeDetailContent.tsx` admin, plano #30 desta mesma sessão). O pedido diz
  "Modal/Tela de Edição" (modal OU tela) — a tela já atende. **Ambiguidade a
  resolver com o usuário**: o botão que abre essa tela hoje se chama
  "Permissões" (`Icon="Shield"`), não "Editar" — e a tela não tem nenhum campo
  pra editar nome/e-mail do funcionário, só o `TransferList` de permissões e o
  histórico de auditoria. Se "Editar" no pedido é sinônimo de "gerenciar", só
  renomear o botão resolve; se é pra editar nome/e-mail de verdade, isso é
  funcionalidade nova que não existe hoje em lugar nenhum (nem pra
  cliente/produto - todos os "editar" do dashboard editam dados de negócio, nunca
  identidade/credencial de outro usuário).
- Nenhuma das duas telas tem busca ou filtro hoje (nem por nome/e-mail, nem por
  permissão) — confirma o achado do plano #33 (nenhuma tela de funcionários tem
  busca) estendido pra esse caso específico.

## 2. Testes a incluir/alterar

Nenhum dos dois `EmployeesContent.tsx` tem teste hoje (mesmo achado do plano
#36). Pra cada tela nova/renomeada:

- **`app/(employee)/dashboard/employees/EmployeesContent.tsx`** (fica só
  Funcionários): busca por nome/e-mail só dispara no botão (padrão #33);
  `FilterDropdown` de permissão (padrão #34) manda `?permission=` (múltiplos
  valores); fetch inicial e após busca sempre manda `?role=EMPLOYEE`; ação
  "Editar"/"Permissões" navega/abre a tela com `TransferList`; "Excluir" abre
  `ConfirmDeleteDialog` (padrão #36, hoje exclui sem confirmar).
- **`app/(admin)/dashboard/admin/admins/AdminsContent.tsx`** (novo): mesma busca
  por nome/e-mail; **sem** `FilterDropdown` de permissão (não se aplica a admin,
  ver decisão no plano de backend); fetch manda `?role=ADMIN` pra
  `/api/admin/admins`; só botão "Excluir" (sem `onManagePermissions`) — com
  `ConfirmDeleteDialog`; exclusão do último admin mostra o erro 400 do backend
  como toast, sem quebrar a tela; botão "Novo administrador" abre dialog com
  `EmployeeForm` (só nome/e-mail/senha, sem seleção de permissões) chamando
  `POST /api/admin/admins`.

## 3. O que entra no projeto

- **`app/(employee)/dashboard/employees/EmployeesContent.tsx`**: fetch ganha
  `?role=EMPLOYEE` fixo + `search`/`permission` como querystring (padrões #33/#34);
  `POST` de criação continua em `/api/admin/employees` (já cria como `EMPLOYEE`).
- **`app/(admin)/dashboard/admin/employees/EmployeesContent.tsx`**: essa rota
  deixa de ser "Funcionários" genérico e vira só mais um lugar que lista
  funcionários (`?role=EMPLOYEE`) — mesmo componente/lógica do arquivo employee,
  só muda `backPath`. Ou os dois arquivos colapsam num só componente compartilhado
  recebendo `backPath` (como `ProductEditContent`/`OrdersContent` já fazem hoje) —
  reduz a duplicação que já existe entre os dois arquivos quase idênticos.
- **`app/(admin)/dashboard/admin/admins/`** (nova rota): `page.tsx` +
  `AdminsContent.tsx`, usando `EmployeeManagementTable` **sem**
  `onManagePermissions`, fetch em `/api/admin/admins`.
- **Navegação** (`AdminShell.tsx`, plano #31): novo item de sidebar "Administradores"
  (ícone sugerido: `ShieldCheck` ou `UserCog` — `UserCog` já está em uso pra
  "Funcionários", precisa de um diferente) apontando pra `/dashboard/admin/admins`,
  visível só no shell do admin (não existe equivalente no employee — funcionário
  não gerencia admin).
- **`EmployeeManagementTable.tsx`**: sem mudança de código — só passa a ser usada
  em dois contextos (com e sem `onManagePermissions`), como já suporta.
- Botão "Permissões" → renomear pra "Editar" **se** essa for a leitura correta da
  ambiguidade acima (decisão do usuário).

## Decisões pendentes pro usuário

1. Ordem: implementar #33/#34/#36/#37 antes desta refatoração (evita retrabalho
   nas mesmas linhas), ou seguir direto nesta agora e os outros quatro planos se
   ajustam depois?
2. "Editar" no funcionário: renomear o botão "Permissões" existente, ou criar um
   formulário novo de editar nome/e-mail que não existe hoje em nenhuma tela do
   dashboard?
3. Os dois `EmployeesContent.tsx` (admin/employee) colapsam num componente
   compartilhado com `backPath` (like `OrdersContent`/`ProductEditContent` já
   fazem), ou ficam arquivos separados como estão hoje?
