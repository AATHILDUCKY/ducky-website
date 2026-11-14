#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
command -v node >/dev/null || { echo 'Install Node.js 22.9+ (24 LTS recommended).'; exit 1; }
node -e 'if(Number(process.versions.node.split(".")[0])<22)process.exit(1)' || { echo 'Node.js 22+ is required.'; exit 1; }
node scripts/create-env.mjs
if [[ ! -d node_modules ]] || [[ package-lock.json -nt node_modules/.package-lock.json ]]; then
  npm ci --include=dev --no-audit --no-fund
fi
node --env-file=.env scripts/ensure-db.mjs
npm run db:setup
node --env-file=.env -e 'console.log(`\nYour portfolio: http://localhost:${process.env.PORT || 3000}\nAdmin: http://localhost:${process.env.PORT || 3000}/admin\nAdmin credentials are in .env.\n`)' 
app_port="$(node --env-file=.env -e 'process.stdout.write(process.env.PORT || "3000")')"
# Next loads .env itself; passing --env-file to its CLI breaks development-worker respawning.
exec node --max-old-space-size=768 node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port "$app_port"
