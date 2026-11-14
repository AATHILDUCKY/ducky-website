import pg from 'pg';
import { existsSync, readdirSync, mkdirSync, writeFileSync, unlinkSync, chmodSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import net from 'node:net';
function fail(message) {
  console.error(message);
  process.exit(1);
}
const connection = process.env.DATABASE_URL;
if (!connection) fail('Set DATABASE_URL in .env before starting.');
const config = new URL(connection);
const port = Number(config.port || 5432);
const db = new pg.Pool({ connectionString: connection, max: 1, connectionTimeoutMillis: 3000 });
try {
  await db.query('SELECT 1');
  console.log('PostgreSQL is ready.');
  await db.end();
  process.exit(0);
} catch {
  await db.end();
}
if (!['127.0.0.1', 'localhost'].includes(config.hostname))
  fail(
    'Cannot reach the configured PostgreSQL server. Check DATABASE_URL and the remote database.',
  );
const occupied = await new Promise((res) => {
  const socket = net.connect({ host: config.hostname, port });
  socket.on('connect', () => {
    socket.destroy();
    res(true);
  });
  socket.on('error', () => res(false));
  socket.setTimeout(2000, () => {
    socket.destroy();
    res(false);
  });
});
if (occupied)
  fail(
    'A server already uses the database port, but the connection failed. Check the database name, user, and password in .env. No existing database was changed.',
  );
let bin;
try {
  bin = execFileSync('pg_config', ['--bindir'], { encoding: 'utf8' }).trim();
} catch {}
if (!bin || !existsSync(`${bin}/initdb`)) {
  const roots = [
    '/usr/lib/postgresql',
    '/usr/local/opt/postgresql@17',
    '/opt/homebrew/opt/postgresql@17',
  ];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    if (existsSync(`${root}/bin/initdb`)) bin = `${root}/bin`;
    else {
      for (const v of readdirSync(root).sort().reverse()) {
        if (existsSync(`${root}/${v}/bin/initdb`)) {
          bin = `${root}/${v}/bin`;
          break;
        }
      }
    }
    if (bin) break;
  }
}
if (!bin)
  fail(
    'PostgreSQL server binaries were not found. Install PostgreSQL 14+ (Ubuntu: sudo apt install postgresql postgresql-contrib), or set DATABASE_URL to an existing database.',
  );
if (process.getuid?.() === 0)
  fail(
    'Run this application as a regular user. PostgreSQL does not allow a local cluster to run as root.',
  );
const root = resolve('.postgres');
const data = resolve(root, 'data');
const socket = resolve(root, 'socket');
mkdirSync(root, { recursive: true, mode: 0o700 });
mkdirSync(socket, { recursive: true, mode: 0o700 });
chmodSync(root, 0o700);
const username = decodeURIComponent(config.username),
  password = decodeURIComponent(config.password),
  name = decodeURIComponent(config.pathname.slice(1));
if (!username || !password || !name)
  fail('DATABASE_URL must contain a database name, username, and password.');
const options = { stdio: 'inherit', env: { ...process.env, PGPASSWORD: password } };
if (!existsSync(resolve(data, 'PG_VERSION'))) {
  const passwordFile = resolve(root, 'init-password');
  writeFileSync(passwordFile, password, { mode: 0o600 });
  try {
    execFileSync(
      `${bin}/initdb`,
      [
        '-D',
        data,
        '-U',
        username,
        '--pwfile',
        passwordFile,
        '--auth-host=scram-sha-256',
        '--auth-local=scram-sha-256',
        '--encoding=UTF8',
        '--no-locale',
      ],
      { stdio: 'ignore' },
    );
  } finally {
    unlinkSync(passwordFile);
  }
}
try {
  execFileSync(
    `${bin}/pg_ctl`,
    [
      '-D',
      data,
      '-l',
      resolve(root, 'postgres.log'),
      '-o',
      `-h 127.0.0.1 -p ${port} -k '${socket.replace(/'/g, "'\\''")}' -c shared_buffers=64MB -c max_connections=20 -c work_mem=2MB -c maintenance_work_mem=32MB`,
      '-w',
      'start',
    ],
    options,
  );
  const adminUrl = new URL(connection);
  adminUrl.pathname = '/postgres';
  const admin = new pg.Pool({ connectionString: adminUrl.toString(), max: 1 });
  try {
    const found = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name]);
    if (!found.rowCount) await admin.query(`CREATE DATABASE "${name.replace(/"/g, '""')}"`);
  } finally {
    await admin.end();
  }
  console.log('Started a private local PostgreSQL cluster in .postgres/ (64 MB shared buffers).');
} catch (error) {
  fail('Could not start the local database. Check .postgres/postgres.log. ' + error.message);
}
