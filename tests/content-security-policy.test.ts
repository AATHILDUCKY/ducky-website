import test from 'node:test';
import assert from 'node:assert/strict';
import { contentSecurityPolicy } from '../lib/content-security-policy';
test('development can evaluate Next.js modules while production disallows eval', () => {
  assert.match(contentSecurityPolicy(true), /script-src 'self' 'unsafe-inline' 'unsafe-eval'/);
  assert.doesNotMatch(contentSecurityPolicy(false), /unsafe-eval/);
});
test('both environments retain same-origin scripts, images, connections, forms, and framing restrictions', () => {
  for (const development of [true, false]) {
    const policy = contentSecurityPolicy(development);
    for (const directive of [
      "default-src 'self'",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-src 'self' https://www.instagram.com",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ])
      assert.ok(policy.includes(directive));
    assert.ok(!policy.replace("frame-src 'self' https://www.instagram.com", '').includes('https:'));
    assert.ok(!policy.includes('*'));
  }
});
