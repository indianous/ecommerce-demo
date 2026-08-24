# 44 — Cadastro em massa de produtos via CSV (frontend)

Plano irmão: `backend/plans/44-importacao-exportacao-csv-produtos.md` (contexto
completo, decisões de design, e os dois endpoints novos — este arquivo cobre
só o frontend).

## Estado atual

- `ProductsContent.tsx` (`components/content/ProductsContent.tsx`) já segue o
  padrão do plano #40 (`ManagementPageHeader`/`ManagementPageBody` com as
  ações "Nova categoria"/"Novo produto" no `actions` da página) — os botões
  de exportar/importar entram nesse mesmo slot.
- `ProductForm.tsx` usa `FileUpload` do base-ds pra imagem (`accept`,
  `multiple`, `onChange(files: File[])`) — mesmo componente serve pro upload
  do CSV, só trocando `accept` pra `.csv` e `multiple={false}`.
- Não existe nenhuma rota BFF nem tipo de CSV/import/export hoje.

## 1. Problemas encontrados

Nenhum — é funcionalidade nova, sem nada quebrado ou desatualizado pra
corrigir antes.

## 2. Testes a incluir/alterar (agrupados por arquivo)

- **`ProductsContent.test.tsx`** (adicionar seção nova):
  - botão "Exportar CSV" dispara o download (chama `GET /api/admin/products/export`
    — testável verificando a chamada ao endpoint, já que download de arquivo
    via `<a>`/blob não é facilmente observável em jsdom; ver nota abaixo).
  - botão "Importar CSV" abre um `Dialog` com `FileUpload` (`accept=".csv"`).
  - selecionar um arquivo e confirmar chama `POST /api/admin/products/import`
    como `multipart/form-data`.
  - depois do import, mostra o relatório retornado (quantos criados, lista de
    erros por linha, avisos de GTIN duplicado) dentro do próprio `Dialog`.
  - erro de rede/arquivo inválido mostra toast de erro sem quebrar a tela.
  - sucesso no import recarrega a lista de produtos (`reload()` do
    `usePaginatedFetch`) pra mostrar os produtos novos.

## 3. O que entra no projeto

### Tipos (`types/index.ts`)
- Novo `ProductImportReport`: `{ createdCount: number; created: { name: string; slug: string; renamed: boolean }[]; errors: { row: number; message: string }[]; warnings: { row: number; message: string }[] }`.

### BFF
- Novo `app/api/admin/products/export/route.ts` (`GET`, proxy — repassa o
  `Content-Type: text/csv` e o corpo como stream, sem tentar fazer `.json()`
  nele, diferente do `proxyJson` usado nos outros BFFs).
- Novo `app/api/admin/products/import/route.ts` (`POST`, proxy multipart —
  mesmo padrão de `app/api/upload/image/route.ts`: repassa `request.formData()`
  direto, com `Authorization`).

### Componentes
- **`ProductsContent.tsx`**: no `actions` do `ManagementPageBody` (ao lado de
  "Nova categoria"/"Novo produto"), dois novos botões — "Exportar CSV"
  (`<a>`/download direto pro BFF, sem passar por `fetch`+blob se o browser
  já lida bem com `Content-Disposition: attachment` vindo do backend — a
  confirmar no momento da implementação) e "Importar CSV" (abre `Dialog`).
- **Novo `ProductImportDialog.tsx`** (`components/forms/` ou
  `components/product/`, a decidir pelo padrão do arquivo vizinho mais
  parecido): `FileUpload` pro `.csv`, botão de confirmar, estado de
  carregando, e a exibição do `ProductImportReport` depois do retorno
  (contagem de criados, tabela/lista de erros por linha, avisos).

### `base-ds`
Nenhum componente novo necessário — `FileUpload`/`Dialog`/`Button`/`Table` (ou
lista simples) já cobrem a tela de relatório.
