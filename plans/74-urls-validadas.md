# 74 — URLs enviadas por usuários validadas por esquema e origem — frontend

Resolve, junto com o backend, a issue **#17** do `ecommerce-backend`. Plano irmão:
`backend/plans/74-urls-validadas.md`. O backend passa a recusar (400) links que não sejam `http://`, `https://`
ou um caminho começando com `/`. Este lado avisa no próprio formulário, como o `NavItemForm` já faz.

## Contexto

O `NavItemForm` já mostra "URL deve começar com http:// ou https://" e desabilita o salvar. O `BannerForm`
(link do banner) e o `SocialLinksForm` (Instagram, TikTok, Facebook) não validam nada: um valor como
`instagram.com/loja` vai ao backend, volta 400, e a tela mostra só "Erro ao salvar redes sociais.".

As fotos de avaliação e os anexos não mudam: o frontend só envia URLs que saíram do upload da loja.

### Decisões

| Formulário | Comportamento |
| --- | --- |
| `BannerForm` | Link opcional. Se preenchido e não for `http://`, `https://` ou caminho começando com `/`, mostra o erro no campo e desabilita o salvar |
| `SocialLinksForm` | Cada link é opcional. Se preenchido e não for `http://` ou `https://`, mostra o erro no campo e desabilita o salvar |
| Recusa do backend | O toast mostra a mensagem que veio do backend, quando houver |

A regra de "link seguro" fica num lugar só (`lib/safe-url.ts`) e o `NavItemForm` passa a usá-la, sem mudar o
comportamento dele.

## 1. Problemas encontrados

| Arquivo | Linha | Diagnóstico |
| --- | --- | --- |
| `components/forms/BannerForm.tsx` | 35–42 | O link não é validado |
| `components/forms/SocialLinksForm.tsx` | 34–62 | Os três links não são validados |
| `components/forms/NavItemForm.tsx` | 47 | A regra está escrita dentro do formulário (regex solta) |
| `components/content/dashboard/site/SiteSocialLinksContent.tsx` | 26–29 | Toast genérico no erro |

## 2. Testes a incluir/alterar

### `lib/__tests__/safe-url.test.ts` (novo)

1. `isSafeLink`: aceita `https://…`, `http://…` e `/catalog`; recusa `javascript:`, `data:`, `//evil.example`,
   `instagram.com/loja`.
2. `isAbsoluteHttpUrl`: aceita `http(s)://host`; recusa caminho relativo e os casos acima.

### `components/forms/__tests__/BannerForm.test.tsx` e `SocialLinksForm.test.tsx` (novos ou alterados)

Os dois formulários passam a ter validação própria, então ganham teste próprio (convenção do projeto):

1. Link inválido → mensagem no campo e botão de salvar desabilitado.
2. Link válido ou vazio → sem mensagem e botão habilitado.

### `components/forms/__tests__/NavItemForm.test.tsx` (se existir, sem mudança de comportamento)

Os testes atuais continuam passando com a regra vinda de `lib/safe-url.ts`.

## 3. O que entra no projeto

- `lib/safe-url.ts`: `isSafeLink(url)` e `isAbsoluteHttpUrl(url)`.
- `BannerForm` e `SocialLinksForm`: erro no `FormField` (`error`) e `disabled` no botão, como o `NavItemForm`.
- `SiteSocialLinksContent` e a tela de banners: toast com o `message` do backend no erro.

## O que o usuário verifica

1. Em **Site → Redes sociais**, digitar `instagram.com/loja`: o campo mostra o erro e o salvar fica desabilitado.
   Com `https://instagram.com/loja`, salva.
2. Em **Site → Banners**, um link `javascript:alert(1)` mostra o erro. Um link `/catalog` ou `https://…` salva.
3. A avaliação com foto continua funcionando na loja.
