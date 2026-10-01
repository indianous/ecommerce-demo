# Vitrine Demo — demonstração do e-commerce

Esta é a versão de demonstração do frontend do e-commerce: uma loja de moda fictícia que roda sem o backend real.
Um **backend falso**, servido pelo próprio Next, responde nas mesmas rotas da API a partir de dados gerados.
Dá para navegar por tudo, mas **nada é salvo**.

## Contas

| Perfil | E-mail | O que dá para ver |
| --- | --- | --- |
| Cliente | `cliente@demo.com` | loja, carrinho, checkout, pedidos, avaliações, perfil |
| Funcionário | `funcionario@demo.com` | painel com todas as permissões: pedidos, produtos, estoque, clientes, site |
| Administrador | `admin@demo.com` | tudo do funcionário, mais administradores e auditoria |

**Qualquer senha funciona.** Não há verificação em duas etapas.

## O que esperar

- **Leituras são reais:** listagens, filtros, busca, paginação e detalhes consultam os dados gerados.
- **Escritas respondem sucesso, mas não têm efeito.** Depois de salvar, a tela volta com o dado anterior. Isso vale
  para carrinho, lista de desejos, notificações lidas, edição de produto, mudança de status de pedido etc.
- **O checkout não cobra nada:** o botão de pagamento leva de volta para "Meus pedidos".
- **O cadastro** abre a sessão da conta de cliente da demo.
- **As datas acompanham o dia de hoje:** pedidos, visitas e promoções são sempre recentes.
- **Uploads** não enviam o arquivo; a resposta aponta para uma imagem de exemplo.

## Como funciona

```
navegador → BFF (app/api/*) → API_INTERNAL_URL = /demo-backend/api/v1 → demo/fake-backend → demo/data.json
```

| Caminho | O quê |
| --- | --- |
| `demo/data.config.json` | Quantos registros gerar de cada entidade |
| `demo/generator/generate.ts` | Gerador: lê a configuração e escreve `demo/data.json` e as imagens SVG em `public/demo/images/` |
| `demo/fake-backend/` | Responde cada rota a partir do `data.json` |
| `app/demo-backend/api/v1/[...path]/route.ts` | A rota do Next que expõe o backend falso |
| `demo/__tests__/` | Testes do gerador, do backend falso e da cobertura das rotas |
| `demo/sync.sh` | Traz as mudanças do repositório original |

Este repositório é uma cópia do `ecommerce-frontend`. **Nenhum arquivo do original é alterado**: o demo só acrescenta
os caminhos acima. Por isso a sincronização nunca conflita.

## Mudar os dados

1. Ajuste as quantidades em `demo/data.config.json` (o editor mostra a descrição e os limites de cada campo).
2. Rode `node demo/generator/generate.ts`.
3. Faça commit de `demo/data.json` e `public/demo/images/`.

A mesma `seed` gera sempre os mesmos dados. As três contas acima são criadas sempre, além das quantidades.

## Sincronizar com o original

```bash
demo/sync.sh          # merge de upstream/main + typecheck + testes + build
git push origin main  # publica
```

Se o original passar a chamar uma rota nova do backend, `demo/__tests__/coverage.test.ts` falha dizendo qual é. Se
um tipo mudar, o `typecheck` falha no gerador.

## Rodar localmente

```bash
export GITHUB_PACKAGES_TOKEN=$(gh auth token)   # o @indianous/base-ds vem do GitHub Packages
npm ci
API_INTERNAL_URL=http://localhost:3000/demo-backend/api/v1 NEXT_PUBLIC_FISCAL_INVOICE_EMISSION_ENABLED=false npm run dev
```

## Publicar na Vercel

Variáveis de ambiente do projeto:

| Variável | Valor |
| --- | --- |
| `GITHUB_PACKAGES_TOKEN` | token com `read:packages` |
| `API_INTERNAL_URL` | `https://<domínio-de-produção>/demo-backend/api/v1` |
| `NEXT_PUBLIC_FISCAL_INVOICE_EMISSION_ENABLED` | `false` |

O `next build` pré-renderiza a home, o catálogo e o layout buscando dados em `API_INTERNAL_URL`. No **primeiro**
deploy o domínio ainda não responde e essas páginas saem vazias: faça um **redeploy** logo depois. Nos seguintes, o
build busca os dados no deploy anterior.
