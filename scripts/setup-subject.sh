#!/usr/bin/env bash
# Prepara um sujeito (biblioteca OSS) no commit fixado, com Vitest, cobertura e Stryker instalados.
# uso: [SUBJECTS_FILE=data/subjects-serverest.json] scripts/setup-subject.sh <library> [destino]    (padrão: subjects/<library>)
# Sujeitos pnpm (padrão) e npm (campo "pm" no arquivo de sujeitos; ex.: serverest, cuja suíte humana roda em Mocha).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LIB="${1:?uso: setup-subject.sh <library> [destino]}"
DEST="${2:-$ROOT/subjects/$LIB}"
STRYKER_VERSION="${STRYKER_VERSION:-10.1.1}"

read -r REPO COMMIT PNPM PM < <(node -e '
  const s = require(process.argv[1]).libraries.find(l => l.name === process.argv[2]);
  if (!s) { console.error("biblioteca desconhecida: " + process.argv[2]); process.exit(1); }
  console.log(s.repo, s.commit, s.pnpm || "-", s.pm || "pnpm");
' "$ROOT/${SUBJECTS_FILE:-data/subjects.json}" "$LIB")

mkdir -p "$DEST"
cd "$DEST"
if [ ! -d .git ]; then
  git init -q
  git remote add origin "https://github.com/$REPO.git"
fi
# Fim de linha fixo em LF: alguns testes humanos comparam o texto dos arquivos-fonte (falham com CRLF no Windows).
git config core.autocrlf false
git config core.eol lf
git fetch -q --depth 1 origin "$COMMIT"
git checkout -q --force FETCH_HEAD
git clean -fdq -e node_modules

if [ "$PM" = "npm" ]; then
  # --ignore-scripts: o projeto usa husky em `prepare`, que não deve rodar aqui.
  npm ci --ignore-scripts --no-audit --no-fund
  VITEST_VERSION="${VITEST_VERSION:-3.2.7}"
  npm i -D --ignore-scripts --no-audit --no-fund \
    "vitest@$VITEST_VERSION" "@vitest/coverage-v8@$VITEST_VERSION" \
    "@stryker-mutator/core@$STRYKER_VERSION" "@stryker-mutator/vitest-runner@$STRYKER_VERSION" "@stryker-mutator/mocha-runner@$STRYKER_VERSION"
  # a instalação acima reescreve package.json/package-lock.json; o experimento não usa esses arquivos em `src`
  echo "[setup] $LIB @ $COMMIT pronto em $DEST (npm, vitest $VITEST_VERSION, stryker $STRYKER_VERSION)"
  exit 0
fi

PNPM_CMD="npx --yes pnpm@$PNPM"
$PNPM_CMD install --frozen-lockfile

VITEST_VERSION="$(node -p "require('./node_modules/vitest/package.json').version")"
EXTRA=()
if [ ! -d node_modules/@vitest/coverage-v8 ]; then EXTRA+=("@vitest/coverage-v8@$VITEST_VERSION"); fi
$PNPM_CMD add -D "@stryker-mutator/core@$STRYKER_VERSION" "@stryker-mutator/vitest-runner@$STRYKER_VERSION" "${EXTRA[@]}"

echo "[setup] $LIB @ $COMMIT pronto em $DEST (vitest $VITEST_VERSION, stryker $STRYKER_VERSION)"
