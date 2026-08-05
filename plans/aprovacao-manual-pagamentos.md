# Aprovação manual de pagamentos (frontend)

## Contexto

Complementa `backend/plans/aprovacao-manual-pagamentos.md`. Fluxo: o cliente
envia o comprovante à empresa por canal externo ao site; o gestor
(`MANAGE_PAYMENTS`) já validou o comprovante quando abre o site — ele anexa o
arquivo recebido (imagem ou PDF) e aprova, ou rejeita informando o motivo.
Sem upload pelo cliente, sem página nova — decisão confirmada com o usuário.

## 1. Problemas encontrados

- `components/forms/PaymentConfirmForm.tsx:15` — `FileUpload accept=` não
  inclui `application/pdf`, então o gestor não consegue nem selecionar um PDF
  como comprovante.
- `.../dashboard/payments/PaymentsContent.tsx:46-63` (`handleReject`) dispara
  o `PATCH` imediatamente com `{status:'FAILED'}`, sem coletar motivo — não
  existe nenhum campo/Dialog para isso.
- Não existe componente de formulário puro para o motivo de rejeição — a
  convenção (`components/forms/` sem `useState`/`fetch`) exige um novo
  componente controlado pelo pai.
- `base-ds` não exporta `Textarea`/`TextArea` (confirmado em
  `node_modules/base-ds/dist/index.d.ts`). Precedente já aceito no projeto:
  `.../dashboard/orders/[id]/OrderDetailContent.tsx:227,271-273` usa
  `<textarea>` nativo para o campo "Justificativa" por falta de equivalente no
  `base-ds`. Vou seguir o mesmo padrão para o motivo de rejeição — aviso
  explícito aqui, sem abrir issue nova no `base-ds` porque o gap já está
  documentado/aceito nesse precedente.
- `frontend/app/(admin)/dashboard/admin/payments/page.tsx:4` renderiza
  `<PaymentsContent />` sem `basePath`, então o botão "Confirmar" navega o
  admin para `/dashboard/payments/{id}/confirm` (rota de employee) em vez de
  `/dashboard/admin/payments/{id}/confirm`. Bug de navegação encontrado
  durante a investigação, corrigido junto por ser trivial e do mesmo fluxo.
- `types/index.ts` (`AdminOrderDetailResponse`) não tem campo para o motivo de
  rejeição — sem tipo, não dá para exibir o histórico depois.
- `.../dashboard/orders/[id]/OrderDetailContent.tsx:163-166` mostra só
  `order.paymentMethod` no bloco "Pagamento" — nem status nem motivo de
  rejeição aparecem ali, então hoje não há como o funcionário revisitar por
  que um pagamento foi rejeitado.

## 2. Testes a incluir/alterar

**`components/forms/__tests__/RejectPaymentForm.test.tsx`** (novo — tem
validação própria, então ganha teste dedicado por convenção)
- botão de confirmar rejeição desabilitado com motivo vazio/só espaços.
- habilita ao digitar um motivo.
- chama `onSubmit` com o texto digitado.
- `onCancel` é chamado pelo botão cancelar sem chamar `onSubmit`.

**`.../dashboard/payments/__tests__/PaymentsContent.test.tsx`** (novo)
- lista pedidos vindos de `GET /api/admin/orders?paymentStatus=PENDING...`.
- clique em "Rejeitar" abre um `Dialog` (não dispara PATCH imediatamente).
- `within(dialog)`: botão "Confirmar rejeição" desabilitado sem motivo.
- preenche motivo, confirma → `PATCH .../payment-status` com
  `{status:'FAILED', rejectionReason: '<texto>'}`, pedido some da lista, toast
  de sucesso.
- fecha o Dialog sem confirmar → nenhum PATCH é disparado.
- clique em "Confirmar" navega para `${basePath}/{id}/confirm` — cobre tanto
  o uso default (`/dashboard/payments`) quanto passando
  `basePath="/dashboard/admin/payments"`, para travar o bug do path do admin.

**`.../dashboard/payments/[id]/__tests__/PaymentConfirmContent.test.tsx`**
(existente é `frontend/app/(employee)/__tests__/employee.pagamento.confirmar.page.test.tsx`
— estender esse arquivo em vez de criar outro, mantém os testes de upload/PATCH/erro já cobertos)
- **novo**: `FileUpload` aceita `application/pdf` (assert no atributo
  `accept` do input ou upload de um `File` com `type: 'application/pdf'`
  seguido de PATCH bem-sucedido).
- **novo**: quando a API responde 400 com corpo `{message}` (aprovação sem
  comprovante ou já resolvida), o toast de erro exibe a mensagem retornada
  pelo backend em vez do texto genérico atual.

**`.../dashboard/admin/payments/__tests__/page.test.tsx`** (novo, pequeno)
- `AdminPaymentsPage` renderiza `PaymentsContent` com
  `basePath="/dashboard/admin/payments"` (regressão do bug de navegação).

## 3. O que entra no projeto

**Tipos** (`types/index.ts`):
- `AdminOrderDetailResponse`: adiciona `paymentRejectionReason?: string`.

**BFF**:
- `app/api/upload/payment-receipt/route.ts`: troca o proxy de
  `${API}/upload/image` para `${API}/upload/receipt` (novo endpoint do
  backend que aceita imagem + PDF).
- `app/api/admin/orders/route.ts`: nenhuma mudança — já repassa todos os
  `searchParams` (`paymentStatus` incluso) para o backend.
- `app/api/admin/orders/[id]/payment-status/route.ts`: nenhuma mudança
  estrutural — o body (`rejectionReason`) já passa direto (proxy genérico).

**Componentes**:
- `components/forms/PaymentConfirmForm.tsx`: `accept` passa a
  `"image/jpeg,image/png,image/webp,image/gif,application/pdf"`.
- `components/forms/RejectPaymentForm.tsx` (novo, puro/controlado): `Dialog`
  de rejeição — `FormField` + `<textarea>` nativo (motivo, obrigatório) +
  botões "Confirmar rejeição"/"Cancelar", desabilitados por `submitting`.

**Páginas**:
- `.../dashboard/payments/PaymentsContent.tsx`: `handleReject` deixa de
  disparar PATCH direto; abre um `Dialog` (`base-ds`) com
  `RejectPaymentForm`, estado do motivo/pedido em revisão vive aqui (pai
  controla, form fica puro); confirmação faz o `PATCH` com
  `{status:'FAILED', rejectionReason}`.
- `.../dashboard/admin/payments/page.tsx`: passa
  `basePath="/dashboard/admin/payments"` para `PaymentsContent` (fix do bug
  de navegação).
- `.../dashboard/orders/[id]/OrderDetailContent.tsx`: bloco "Pagamento"
  (linha ~163) passa a mostrar também um `Badge` de `paymentStatus` e, quando
  `paymentRejectionReason` existir, o motivo da rejeição — dá visibilidade ao
  gestor/funcionário sobre por que um pagamento foi recusado, sem precisar
  abrir a tela de confirmação de novo.
