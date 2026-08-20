# Dados pessoais do cliente: telefone, data de nascimento e gênero (frontend)

## Contexto

Par do plano de backend [[21-dados-pessoais-cliente]] (mesma fase). Adiciona
telefone, data de nascimento e gênero ao cadastro (`RegisterForm`), ao "Meus
dados" (`ProfileDataForm`) e à tela de detalhes do cliente no admin/employee
(`CustomerDetailContent.tsx`), consumindo os campos novos que o backend passa
a devolver em `UserResponse`/`CustomerDetailResponse`.

**Decisão confirmada:** idade **não é coletada nem enviada** em nenhum
formulário — só existe `birthDate`. Idade é **calculada no frontend**, na
hora de exibir, a partir de `birthDate` e da data atual (`new Date()`). Isso
significa que "Idade" nunca é um campo de formulário, só um valor derivado
mostrado como texto (na tela de detalhe do cliente no admin).

`base-ds` já tem tudo que precisa — confirmado em
`node_modules/base-ds/dist/index.d.ts`: `Select` (pra gênero, com
`SelectOption[]`), `Input` (`type="date"` pra data de nascimento, mesmo
padrão que outros campos de data do projeto já devem usar — confirmar na
hora de implementar se há um componente de data dedicado além do `Input`
nativo; e `Input` pra telefone, como já é usado pros outros campos de
texto). Não precisa abrir issue no `base-ds`.

## 1. Problemas encontrados

- `types/index.ts` — `User`/`CustomerDetailResponse` (o tipo que já existe
  pra essa resposta) não têm `phone`, `birthDate`, `gender`.
- `components/forms/RegisterForm.tsx` — formulário de cadastro não coleta os
  3 campos (são opcionais no backend, então o form pode continuar
  funcionando sem eles até esse plano rodar).
- `components/forms/ProfileDataForm.tsx` — "Meus dados" só edita
  nome/e-mail.
- `app/(customer)/profile/ProfileContent.tsx:15-16,29-31,46` — só lê/grava
  `name`/`email`.
- `app/(employee)/dashboard/customers/[id]/CustomerDetailContent.tsx:49-53`
  — tela de detalhe não tem seção "Dados pessoais" nenhuma além de
  nome/e-mail soltos no topo.
- Não existe nenhum utilitário de cálculo de idade a partir de data de
  nascimento no projeto (`lib/` não tem nada parecido).

## 2. Testes a incluir/alterar

- `lib/__tests__/age.test.ts` (novo, pro utilitário de cálculo — ver
  abaixo): data de nascimento há exatamente 30 anos retorna 30; data de
  nascimento cujo aniversário ainda não chegou este ano retorna 29 (não
  arredonda pra cima antes do dia); `birthDate` nulo/`undefined` retorna
  `null` (não lança exceção, não retorna `0` como se fosse idade real).
- `components/forms/__tests__/RegisterForm.test.tsx` (já existe, tem
  validação própria) — novos casos: preenche telefone/data de
  nascimento/gênero e o submit inclui os 3 no payload (sem `age` nenhum);
  deixando em branco, o submit não quebra (campos opcionais) e usa o mesmo
  default do backend (não manda `gender` quando o usuário não escolheu
  nada, deixa o backend decidir).
- `components/forms/__tests__/ProfileDataForm.test.tsx` (novo — ganhou
  validação própria com a checagem de data de nascimento, então se
  qualifica pela exceção da convenção do projeto): data de nascimento no
  futuro mostra erro e bloqueia o submit; os demais campos passam livre.
- `app/(customer)/__tests__/profile.page.test.tsx` (existente, se houver —
  senão o teste cai dentro de `ProfileContent`): salvar "Meus dados" inclui
  `phone`/`birthDate`/`gender` no `PATCH /api/auth/me` — sem `age`.
- `app/(employee)/__tests__/customers.detail.page.test.tsx` (novo, ou
  adicionado ao teste de página existente se já houver um): renderiza
  telefone/data de nascimento/gênero quando presentes; mostra "Idade"
  calculada corretamente a partir de `birthDate` (usa o utilitário de
  `lib/age.ts`, não um valor vindo da API); mostra "Não informado" pra
  telefone/data de nascimento/idade quando `phone`/`birthDate` vêm `null`
  (idade "Não informado" é consequência direta de `birthDate` nulo — não
  tem estado próprio); mostra o rótulo em português mapeado do enum de
  gênero (`PREFIRO_NAO_DIZER` → "Prefiro não dizer" etc.), nunca o valor
  cru do enum.

## 3. O que entra no projeto

### `lib/age.ts` (novo)

```ts
export function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate())
  if (!hasHadBirthdayThisYear) age -= 1
  return age
}
```

### Tipos — `types/index.ts`

```ts
export type Gender = 'FEMININO' | 'MASCULINO' | 'NAO_BINARIO' | 'PREFIRO_NAO_DIZER'

// em User / CustomerDetailResponse:
phone: string | null
birthDate: string | null // ISO date (YYYY-MM-DD)
gender: Gender
```

Sem `age` no tipo — não existe no contrato da API (ver plano de backend).

### `components/forms/RegisterForm.tsx`

- + `FormField` com `Input` (telefone), `Input type="date"` (data de
  nascimento, `max` = hoje), `Select` (gênero) com as 4 opções rotuladas em
  português. Os 3 ficam depois dos campos existentes, claramente marcados
  como opcionais (label sem asterisco/sem `required`). Nenhum campo de
  idade no formulário.

### `components/forms/ProfileDataForm.tsx`

- Mesmos 3 campos, mesmo padrão dos outros forms puros do projeto (recebe
  valor + `onChange` via props, sem `useState` próprio) — validação de
  data de nascimento (não pode ser no futuro) é a exceção que justifica o
  teste dedicado.

### `app/(customer)/profile/ProfileContent.tsx`

- Novos `useState` pra `phone`/`birthDate`/`gender`, populados no `fetch`
  inicial e enviados no `PATCH /api/auth/me` junto com nome/e-mail.

### `app/(employee)/dashboard/customers/[id]/CustomerDetailContent.tsx`

- Nova seção "Dados pessoais" (`Heading` + lista de `Text`), com:
  - Telefone: valor ou "Não informado";
  - Data de nascimento: valor formatado (dd/mm/aaaa) ou "Não informado";
  - Idade: `calculateAge(customer.birthDate)` — mostra o número ou "Não
    informado" quando `birthDate` é `null` (sem estado/campo próprio,
    puramente derivado na renderização);
  - Gênero: rótulo mapeado (function `genderLabel(gender: Gender): string`
    local ao componente ou em `lib/`, mesmo padrão de mapeamento
    enum→rótulo que o projeto já usa em outros lugares do admin, ex.
    status de pedido).

### Fora de escopo

- Não mexe na listagem (`CustomersContent.tsx`) — os campos só aparecem no
  detalhe.
- Não adiciona os campos em nenhum formulário de criação de cliente pelo
  admin (não existe hoje; clientes só se cadastram sozinhos).
- Não mostra "Idade" em nenhum outro lugar do site além da tela de detalhe
  do cliente no admin — não foi pedido em outro contexto.
