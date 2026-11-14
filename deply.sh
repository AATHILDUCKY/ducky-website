#!/usr/bin/env bash
# Requested spelling is preserved. deploy.sh is an alias.
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
mode="${1:-start}"
case "$mode" in start|--build-only|--start-only) ;; *) echo 'Usage: ./deply.sh [--build-only | --start-only]'; exit 1;; esac
node scripts/create-env.mjs
if [[ "$mode" != '--start-only' ]]; then
  npm ci --include=dev --no-audit --no-fund
  node --env-file=.env scripts/ensure-db.mjs
  npm run db:setup
  NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS='--max-old-space-size=1024' npm run build
  # The running release stays intact until a replacement build succeeds.
  mkdir -p .runtime
  release="$(date +%Y%m%d%H%M%S)-$$"
  mkdir -p ".runtime/$release"
  cp -a .next/standalone/. ".runtime/$release/"
  mkdir -p ".runtime/$release/.next"
  cp -a .next/static ".runtime/$release/.next/static"
  cp -a public ".runtime/$release/public"
  rm -f ".runtime/$release/.env"
  # .env remains in the source directory, outside the deployed assets.
  ln -sfn "$release" .runtime/next
  mv -Tf .runtime/next .runtime/current
  echo 'Production build is ready in .runtime/current.'
fi
if [[ "$mode" == '--build-only' ]]; then exit 0; fi
[[ -f .runtime/current/server.js ]] || { echo 'Run ./deply.sh --build-only first.'; exit 1; }
node --env-file=.env scripts/ensure-db.mjs
exec node --env-file=.env --max-old-space-size=384 scripts/start-production.mjs
