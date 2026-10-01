#!/usr/bin/env bash
# Traz as mudanças do repositório original (ecommerce-frontend) para o demo e confere se tudo continua de pé.
# Não faz o push: no fim, mostra o comando para você rodar.
#
# Uso: demo/sync.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Há alterações não commitadas. Faça commit ou stash antes de sincronizar." >&2
  exit 1
fi

lock_before=$(git rev-parse HEAD:package-lock.json)
git fetch upstream
if ! git merge --no-edit upstream/main; then
  echo >&2
  echo "O merge teve conflito. Isso só acontece se algum arquivo do original foi alterado no demo:" >&2
  echo "o demo deve apenas acrescentar arquivos (demo/, app/demo-backend/, public/demo/, DEMO.md)." >&2
  exit 1
fi

if [ "$lock_before" != "$(git rev-parse HEAD:package-lock.json)" ]; then
  echo "package-lock.json mudou: instalando dependências..."
  npm ci
fi

if ! npm run typecheck; then
  echo >&2
  echo "O typecheck falhou. Se o erro está em demo/, um tipo mudou no original:" >&2
  echo "ajuste demo/generator/generate.ts e rode node demo/generator/generate.ts para regerar os dados." >&2
  exit 1
fi

if ! npx vitest run; then
  echo >&2
  echo "Algum teste falhou. Se foi demo/__tests__/coverage.test.ts, o original passou a chamar uma rota" >&2
  echo "que o backend falso não conhece: acrescente a consulta em demo/fake-backend/queries/." >&2
  exit 1
fi

npm run build

echo
echo "Tudo certo. Para publicar a demo atualizada:"
echo "  git push origin main"
