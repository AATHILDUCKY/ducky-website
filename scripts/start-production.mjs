import { parseEnv } from 'node:util';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
// OS shells often already define HOSTNAME. Honor the application's configured bind address.
const config = parseEnv(readFileSync('.env', 'utf8'));
process.env.HOSTNAME = config.HOSTNAME || '127.0.0.1';
process.env.PORT = config.PORT || '3000';
process.env.NODE_ENV = 'production';
await import(pathToFileURL(resolve('.runtime/current/server.js')).href);
