import nextEnv from '@next/env';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { parseEnv } from 'node:util';

const mode = process.argv[2];
if (!['build', 'start'].includes(mode)) {
  console.error('Usage: node scripts/application.mjs <build|start>');
  process.exit(1);
}

if (mode === 'start' && !existsSync('.next/BUILD_ID')) {
  console.error('No production build found. Run npm run build before npm start.');
  process.exit(1);
}

process.env.NODE_ENV = 'production';
let config = nextEnv.loadEnvConfig(process.cwd());
// A fresh checkout gets private credentials; deployed environment variables take precedence.
if (!process.env.DATABASE_URL && config.loadedEnvFiles.length === 0) {
  await import('./create-env.mjs');
  config = nextEnv.loadEnvConfig(process.cwd(), false, console, true);
}

const missing = ['DATABASE_URL', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'SESSION_SECRET'].filter(
  (key) => !process.env[key]?.trim(),
);
if (missing.length || process.env.SESSION_SECRET.length < 32) {
  console.error(
    missing.length
      ? `Missing configuration: ${missing.join(', ')}. Set environment variables or use .env.example.`
      : 'SESSION_SECRET must contain at least 32 characters.',
  );
  process.exit(1);
}

let child;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (child) child.kill(signal);
    else process.exit(signal === 'SIGINT' ? 130 : 143);
  });
}

async function run(args) {
  const code = await new Promise((resolve, reject) => {
    child = spawn(process.execPath, args, { stdio: 'inherit', env: process.env });
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve(code ?? (signal === 'SIGINT' ? 130 : 143)));
  });
  child = undefined;
  if (code !== 0) process.exit(code);
}

// Reconnect to an existing database or restart this project's private local cluster.
await run(['scripts/ensure-db.mjs']);
const next = createRequire(import.meta.url).resolve('next/dist/bin/next');
if (mode === 'build') {
  await run(['scripts/setup-db.mjs']);
  await run(['--max-old-space-size=1024', next, 'build', '--webpack', ...process.argv.slice(3)]);
} else {
  // HOSTNAME is commonly a machine name supplied by the OS. Preserve legacy .env settings,
  // while APP_HOST provides an explicit bind address in both env files and hosting platforms.
  const hostname =
    process.env.APP_HOST ||
    config.loadedEnvFiles.map((file) => parseEnv(file.contents).HOSTNAME).find(Boolean) ||
    '0.0.0.0';
  await run([
    '--max-old-space-size=384',
    next,
    'start',
    '--hostname',
    hostname,
    '--port',
    process.env.PORT || '3000',
    ...process.argv.slice(3),
  ]);
}
