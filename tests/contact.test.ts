import test from 'node:test';
import assert from 'node:assert/strict';
import { contactSchema, requestUpdateSchema } from '../lib/contact-validation';
const valid = {
  name: 'Test Person',
  email: 'TEST@example.com',
  subject: 'A collaboration',
  message: 'I would like to discuss a collaboration.',
};
test('contact validation normalizes names and email, preserves message text', () => {
  const data = contactSchema.parse({
    ...valid,
    name: '  Test Person  ',
    message: '  <script>alert(1)</script>  ',
  });
  assert.equal(data.name, 'Test Person');
  assert.equal(data.email, 'test@example.com');
  assert.equal(data.message, '<script>alert(1)</script>');
});
test('contact rejects empty, malformed, and oversized fields', () => {
  for (const [key, value] of [
    ['name', ' '],
    ['name', 'x'.repeat(101)],
    ['email', 'bad'],
    ['subject', 'ab'],
    ['subject', 'x'.repeat(161)],
    ['message', 'short'],
    ['message', 'x'.repeat(5001)],
  ]) {
    assert.equal(contactSchema.safeParse({ ...valid, [key]: value }).success, false, key);
  }
});
test('request updates accept only known statuses, valid ids, and bounded private notes', () => {
  const update = {
    id: '9f15d33e-bbf3-4ad6-8dbd-86ff39013a19',
    revision: '2026-11-11 10:10:10+00',
    status: 'in_progress',
    note: 'Follow up tomorrow',
  };
  assert.equal(requestUpdateSchema.safeParse(update).success, true);
  for (const change of [
    { status: 'deleted' },
    { id: 'invalid' },
    { revision: '' },
    { note: 'x'.repeat(2001) },
  ])
    assert.equal(requestUpdateSchema.safeParse({ ...update, ...change }).success, false);
});
