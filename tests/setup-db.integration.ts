import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Pool } from 'pg';

// Run explicitly with a local PostgreSQL role that can create temporary test databases:
// node --env-file=.env --import tsx --test tests/setup-db.integration.ts
test('fresh setup and repeated builds create no blog posts and preserve authored content', async () => {
  const admin = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const name = 'ducky_setup_test_' + randomUUID().replaceAll('-', '');
  let fixture: Pool | undefined;
  let created = false;
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
    created = true;
    const connection = new URL(process.env.DATABASE_URL!);
    connection.pathname = '/' + name;
    fixture = new Pool({ connectionString: connection.href, max: 1 });
    const setup = () =>
      promisify(execFile)(process.execPath, ['scripts/setup-db.mjs'], {
        env: { ...process.env, DATABASE_URL: connection.href },
      });
    await setup();
    assert.equal(
      (await fixture.query('SELECT count(*)::int AS count FROM posts')).rows[0].count,
      0,
    );
    await fixture.query(
      "INSERT INTO posts(slug,title,excerpt,content) VALUES('authored-test','Authored article','Excerpt','Real content')",
    );
    const before = (await fixture.query('SELECT * FROM posts')).rows;
    await setup();
    assert.deepEqual((await fixture.query('SELECT * FROM posts')).rows, before);
    await fixture.query('DELETE FROM posts');
    await setup();
    assert.equal(
      (await fixture.query('SELECT count(*)::int AS count FROM posts')).rows[0].count,
      0,
    );
  } finally {
    await fixture?.end();
    if (created) await admin.query(`DROP DATABASE "${name}"`);
    await admin.end();
  }
});
