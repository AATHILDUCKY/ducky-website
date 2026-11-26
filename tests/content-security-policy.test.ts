import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adsenseContentSecurityPolicy,
  contentSecurityPolicy,
} from '../lib/content-security-policy';
test('development can evaluate Next.js modules while production disallows eval', () => {
  assert.match(contentSecurityPolicy(true), /script-src 'self' 'unsafe-inline' 'unsafe-eval'/);
  assert.doesNotMatch(contentSecurityPolicy(false), /unsafe-eval/);
});
test('ad pages trust nonced scripts and their descendants without allowing arbitrary scripts', () => {
  for (const development of [true, false]) {
    const policy = adsenseContentSecurityPolicy(development, 'example-random-nonce');
    const directives = policy.split('; ');
    const scripts = directives.find((directive) => directive.startsWith('script-src '))!;
    assert.ok(scripts.includes("'nonce-example-random-nonce' 'strict-dynamic'"));
    assert.ok(!scripts.includes("'unsafe-inline'"));
    assert.ok(!scripts.includes('https:'));
    assert.equal(scripts.includes("'unsafe-eval'"), development);
    for (const directive of [
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ])
      assert.ok(directives.includes(directive));
    assert.ok(directives.includes("frame-src 'self' https:"));
    assert.ok(!contentSecurityPolicy(development).includes('strict-dynamic'));
    assert.ok(!contentSecurityPolicy(development).includes('googlesyndication'));
  }
});
test('both environments allow Analytics while retaining forms and framing restrictions', () => {
  for (const development of [true, false]) {
    const policy = contentSecurityPolicy(development);
    for (const directive of [
      "default-src 'self'",
      "img-src 'self' data: blob: https://www.googletagmanager.com https://*.google-analytics.com",
      "connect-src 'self' https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com",
      "frame-src 'self' https://www.instagram.com https://www.youtube-nocookie.com https://www.linkedin.com",
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
      'https://www.youtube-nocookie.com',
      'https://www.linkedin.com',
    ]);
    for (const source of policy.split(/[;\s]+/)) {
      if (source.startsWith('https:')) assert.ok(allowedOrigins.has(source));
      assert.notEqual(source, '*');
      assert.notEqual(source, 'https:');
    }
  }
});
