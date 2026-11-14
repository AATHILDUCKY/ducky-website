import test from 'node:test';
import assert from 'node:assert/strict';
import { contentSecurityPolicy } from '../lib/content-security-policy';
test('development can evaluate Next.js modules while production disallows eval', () => {
  assert.match(contentSecurityPolicy(true), /script-src 'self' 'unsafe-inline' 'unsafe-eval'/);
  assert.doesNotMatch(contentSecurityPolicy(false), /unsafe-eval/);
});
test('both environments allow Analytics while retaining forms and framing restrictions', () => {
  for (const development of [true, false]) {
    const policy = contentSecurityPolicy(development);
    for (const directive of [
      "default-src 'self'",
      "img-src 'self' data: blob: https://www.googletagmanager.com https://*.google-analytics.com",
      "connect-src 'self' https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com",
      "frame-src 'self' https://www.instagram.com",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ])
      assert.ok(policy.split('; ').includes(directive));
    const scripts = policy.split('; ').find((directive) => directive.startsWith('script-src '));
    assert.ok(scripts?.endsWith(' https://www.googletagmanager.com'));
    const allowedOrigins = new Set([
      'https://www.googletagmanager.com',
      'https://*.google-analytics.com',
      'https://*.google.com',
      'https://www.instagram.com',
    ]);
    for (const source of policy.split(/[;\s]+/)) {
      if (source.startsWith('https:')) assert.ok(allowedOrigins.has(source));
      assert.notEqual(source, '*');
      assert.notEqual(source, 'https:');
    }
  }
});
