import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
const data = resolve('.postgres/data');
if (!existsSync(data + '/postmaster.pid')) {
  console.log('No project-owned database is running.');
  process.exit(0);
}
const bin = execFileSync('pg_config', ['--bindir'], { encoding: 'utf8' }).trim();
execFileSync(bin + '/pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop'], { stdio: 'inherit' });
