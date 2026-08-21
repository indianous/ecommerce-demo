# 30 — Substituir `components/ui/DuelingPicklist` pelo `TransferList` do base-ds

## Contexto

Issue [indianous/base-ds#21](https://github.com/indianous/base-ds/issues/21) (pedindo um
`TransferList`) foi resolvida — `base-ds` agora exporta `TransferList` com a mesma UX do
workaround local (`DuelingPicklist`): duas colunas, clique destaca, duplo-clique ou
botão move, mover tudo dos dois lados.

## 1. Problemas encontrados

- `components/ui/DuelingPicklist.tsx` reimplementa exatamente o que `TransferList` do
  `base-ds` já cobre — mantém cores hardcoded (`border-gray-300`, `bg-blue-500`) fora
  dos tokens do tema, motivo original da issue #21.
- 2 consumidores: `app/(employee)/dashboard/employees/[id]/EmployeeFuncionarioDetailContent.tsx:90-96`
  e `app/(admin)/dashboard/admin/employees/[id]/EmployeeDetailContent.tsx:88-94`, ambos
  passando `onChange={setPermissions}` direto — `TransferList.onChange` é
  `(next: string[]) => void`, mas `setPermissions` espera `EmployeePermission[]`
  (subtipo de `string`), então precisa de `onChange={(next) => setPermissions(next as
  EmployeePermission[])}`.
- **Gap de i18n descoberto**: os 4 botões de mover do `TransferList` têm aria-label
  fixo em inglês interpolado com o label recebido (`` `Move to ${selectedLabel}` ``,
  `` `Move all to ${selectedLabel}` ``, etc. — `TransferList.tsx` não expõe prop pra
  customizar esse texto). Com `availableLabel="Disponíveis"`/`selectedLabel="Atribuídas"`
  (como os dois consumidores já passam), os botões ficam "Move to Atribuídas"/"Move all
  to Disponíveis" — mistura inglês+português, inconsistente com o resto da UI. Vou abrir
  uma issue nova pedindo que esse texto seja customizável, mas sigo com a troca mesmo
  assim (não acho que vale bloquear nisso).

## 2. Testes a incluir/alterar

- `components/ui/__tests__/DuelingPicklist.test.tsx` — removido junto com o componente.
- `app/(employee)/__tests__/employee.funcionario.detalhe.page.test.tsx` e
  `app/(admin)/dashboard/admin/__tests__/employee.detail.page.test.tsx` — trocar as
  queries de botão de `getByRole('button', {name: /mover selecionado para a direita/i})`
  pro novo aria-label em inglês (`/move to atribuídas/i`), mantendo o resto das
  asserções (que já testam via `listbox`/`option` genéricos, compatíveis com
  `TransferList`).

## 3. O que entra no projeto

- `EmployeeFuncionarioDetailContent.tsx` e `EmployeeDetailContent.tsx`: trocar
  `DuelingPicklist` por `TransferList` do `base-ds`, ajustando `onChange` com o cast.
- `components/ui/DuelingPicklist.tsx` e seu teste removidos.
