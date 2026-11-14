import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (!existsSync('.env')) {
  const hex = (n) => randomBytes(n).toString('hex');
  writeFileSync(
    '.env',
    `DATABASE_URL=postgresql://ducky:${hex(18)}@127.0.0.1:55432/ducky\nADMIN_USERNAME=admin\nADMIN_PASSWORD=${randomBytes(24).toString('base64url')}\nSESSION_SECRET=${hex(32)}\nSITE_URL=http://localhost:3000\nCOOKIE_SECURE=false\nPORT=3000\nAPP_HOST=0.0.0.0\n`,
    { mode: 0o600, flag: 'wx' },
  );
  console.log('Created .env with unique admin, database, and session credentials.');
}
