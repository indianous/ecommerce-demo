# 77 — Testes instáveis: cleanup do Testing Library antes do `afterEach` de cada arquivo — frontend

Resolve a issue **#25** (dois testes que falham às vezes, sem mudança no código). Só mexe em testes e na
configuração do Vitest. Nenhum código de produção muda.

## Contexto

### Caso 1 — `CustomerOrdersContent`: "sem o parâmetro, nenhuma mensagem de retorno e nenhum replace"

A suspeita da issue está certa, e agora sabemos o mecanismo exato. Um teste temporário reproduziu a falha.

1. O mock do `next/navigation` devolve um objeto novo a cada `useRouter()`. O efeito que limpa o `?payment=`
   (`CustomerOrdersContent.tsx:47-53`) tem `router` nas dependências, então roda de novo a **cada renderização**
   enquanto houver `?payment=` na URL, e não só na montagem. No Next de verdade o `router` é estável e isso não
   acontece.
2. No teste do `?payment=cancelled`, a renderização que tira o skeleton (fim do fetch) agenda de novo esse efeito.
   O `findByText` resolve quando o DOM muda, às vezes **antes** de o React rodar os efeitos pendentes.
3. O `afterEach` do arquivo limpa o `replaceMock` e depois faz `await act(...)`. O `act` roda o efeito pendente, que
   chama o `replace` **depois** da limpeza.
4. O cleanup do Testing Library, que desmontaria o componente, só roda depois do `afterEach` do arquivo. O Vitest
   roda os `afterEach` na ordem inversa do registro (`sequence.hooks: 'stack'`, o padrão), e o do Testing Library é
   registrado primeiro, no import.
5. O teste seguinte começa com `replaceMock` já chamado uma vez.

Medição: no teste do `?payment=cancelled`, o `replace` roda 1 vez na montagem. Ao fim do `findByText` ele rodou 2
vezes em duas de três rodadas. Na outra rodada rodou só 1, e a segunda chamada só aconteceu no `act` seguinte. Esse
é o caso que suja o teste seguinte.

### Caso 2 — `EmployeeOrdersContent`: "só CREATE_ORDERS: não busca a lista, explica e mostra o Novo pedido"

Outra causa, uma disputa dentro do próprio teste. O botão "Novo pedido" fica no cabeçalho e aparece já na primeira
renderização. A explicação ("A lista de pedidos exige a permissão…") é a mensagem de vazio do
`ManagementContentBody` e só aparece quando o `loading` do `usePaginatedFetch` vira `false`, o que é assíncrono. O
teste espera o botão com `findByRole` e lê a explicação com `getByText`, sem esperar.

### O padrão se repete

| Padrão | Arquivos de teste |
| --- | --- |
| `useRouter: () => ({ ... })`, objeto novo a cada chamada | 88 |
| esses, com `await act(...)` no `afterEach` | 55 |

Componentes com `router` nas dependências de um efeito: `CustomerOrdersContent` e `PermissionGuard`. Corrigir o
mock arquivo por arquivo não impede o próximo caso.

### Decisões

| Ponto | Decisão |
| --- | --- |
| Ordem dos hooks | `sequence: { hooks: 'list' }` no `vitest.config.ts`: os `afterEach` rodam na ordem do registro, e o cleanup do Testing Library (registrado no import) desmonta o componente **antes** do `afterEach` de cada arquivo. O `unmount` roda dentro de `act`, então um efeito pendente roda ali, antes da limpeza dos mocks. Vale para todos os arquivos de uma vez |
| Proteção contra regressão | Teste novo que falha se o cleanup voltar a rodar depois do `afterEach` do arquivo |
| Arquivo do caso 1 | O mock do router passa a devolver sempre o mesmo objeto, como no Next. A limpeza dos mocks e do `mockSearch` também vai para o `beforeEach`: cada teste começa limpo, qualquer que seja o anterior |
| Arquivo do caso 2 | Esperar a explicação com `findByText` e só então conferir o botão |
| Os outros 86 arquivos com mock instável | Ficam como estão: a ordem dos hooks já resolve o vazamento entre testes. Trocar o mock em todos é só mexer em arquivo, sem ganho |
| Componentes | Não mudam. Em produção o `router` é estável |

## 1. Problemas encontrados

| Arquivo | Linha | Diagnóstico |
| --- | --- | --- |
| `vitest.config.ts` | 6–16 | Sem `sequence.hooks`: vale o `'stack'`, e o cleanup do Testing Library roda depois do `afterEach` de cada arquivo |
| `app/(customer)/orders/__tests__/OrdersContent.test.tsx` | 11–15 | O mock do `useRouter` devolve um objeto novo a cada chamada |
| `app/(customer)/orders/__tests__/OrdersContent.test.tsx` | 58–73 | Mocks e `mockSearch` limpos só no `afterEach`, antes do `act` |
| `app/(employee)/dashboard/orders/__tests__/OrdersContent.test.tsx` | 313–314 | `getByText` da explicação logo depois do `findByRole` do botão, sem esperar o fim do carregamento |

## 2. Testes a incluir/alterar

### `__tests__/testing-library-cleanup-order.test.tsx` (novo)

1. Um componente de teste com `useEffect(() => () => { unmountedBeforeFileAfterEach = true })`. O `afterEach` do
   arquivo, registrado depois do import do Testing Library, guarda se o componente já foi desmontado quando ele roda.
   O teste seguinte do arquivo confere que sim. Com `'stack'` falha. Com `'list'` passa.

### `app/(customer)/orders/__tests__/OrdersContent.test.tsx`

2. **Alterado:** o mock usa `const routerMock = { push: pushMock, replace: replaceMock }` e
   `useRouter: () => routerMock`.
3. **Alterado:** `beforeEach` também faz `pushMock.mockClear()`, `replaceMock.mockClear()` e `mockSearch = ''`. O
   `afterEach` continua resetando o store e o MSW.

### `app/(employee)/dashboard/orders/__tests__/OrdersContent.test.tsx`

4. **Alterado:** "só CREATE_ORDERS…" espera com `await screen.findByText(/a lista de pedidos exige…/i)` e depois
   confere o botão com `getByRole`.

## 3. O que entra no projeto

1. `vitest.config.ts`: `test.sequence = { hooks: 'list' }`, com um comentário curto do porquê (issue #25).

Nada muda em tipos, backend, BFF, componentes ou páginas.

## Verificação

- Suíte completa (`npx vitest run`): a troca da ordem dos hooks vale para todos os arquivos, então todos precisam
  continuar passando.
- Os dois arquivos da issue com `--sequence.shuffle`, várias rodadas seguidas, também com a CPU saturada.
- `npx tsc --noEmit`.
- Sem verificação visual: nada muda na aplicação.
