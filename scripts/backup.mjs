import { spawn } from 'node:child_process';
import { mkdirSync, createWriteStream, chmodSync, rmSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing.');
const connection = new URL(process.env.DATABASE_URL);
mkdirSync('backups', { recursive: true, mode: 0o700 });
chmodSync('backups', 0o700);
const file = `backups/ducky-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`;
// Use separate libpq environment variables; credentials never enter shell arguments.
const env = {
  ...process.env,
  PGHOST: connection.hostname.replace(/^\[|\]$/g, ''),
  PGPORT: connection.port || '5432',
  PGUSER: decodeURIComponent(connection.username),
  PGPASSWORD: decodeURIComponent(connection.password),
  PGDATABASE: decodeURIComponent(connection.pathname.slice(1)),
};
for (const key of [
  'sslmode',
  'sslcert',
  'sslkey',
  'sslrootcert',
  'sslcrl',
  'connect_timeout',
  'target_session_attrs',
]) {
  if (connection.searchParams.has(key))
    env[
      key === 'connect_timeout' ? 'PGCONNECT_TIMEOUT' : `PG${key.toUpperCase().replaceAll('_', '')}`
    ] = connection.searchParams.get(key);
}
const output = createWriteStream(file, { mode: 0o600, flags: 'wx' });
const child = spawn('pg_dump', ['--format=custom', '--no-owner', '--no-acl'], {
  env,
  stdio: ['ignore', 'pipe', 'inherit'],
});
const exited = new Promise((resolve, reject) => {
  child.on('error', reject);
  child.on('exit', (code) =>
    code === 0 ? resolve() : reject(new Error('pg_dump failed with exit code ' + code)),
  );
});
try {
  await Promise.all([pipeline(child.stdout, output), exited]);
  console.log('Backup saved:', file);
} catch (error) {
  output.destroy();
  rmSync(file, { force: true });
  throw error;
}
