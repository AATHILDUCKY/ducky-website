import test from 'node:test';
import assert from 'node:assert/strict';
import { articleAuthor, authorInitials } from '../lib/article-author';
import { articleAuthorSchema } from '../lib/validation';
import type { Profile } from '../lib/types';
const profile = { name: 'Aathil Ahamed', portrait: '/portrait.webp' } as Profile;
test('articles use the existing profile until an author override is saved', () => {
  assert.deepEqual(articleAuthor(profile), { name: profile.name, portrait: profile.portrait });
  assert.deepEqual(articleAuthor({ ...profile, articleAuthor: { name: '', portrait: '' } }), {
    name: profile.name,
    portrait: profile.portrait,
  });
  assert.deepEqual(
    articleAuthor({
      ...profile,
      articleAuthor: { name: '  Custom Author  ', portrait: '/media/123' },
    }),
    { name: 'Custom Author', portrait: '/media/123' },
  );
});
test('author initials tolerate extra whitespace and unicode names', () => {
  assert.equal(authorInitials(' Aathil   Ahamed '), 'AA');
  assert.equal(authorInitials('Alex'), 'A');
  assert.equal(authorInitials('   '), '');
  assert.equal(authorInitials('Émile Zola'), 'ÉZ');
});
test('author settings reject external images, invalid ids, and invalid names', () => {
  assert.equal(articleAuthorSchema.safeParse({ name: '', portrait: '' }).success, true);
  assert.equal(
    articleAuthorSchema.safeParse({
      name: 'Aathil',
      portrait: '/media/9f15d33e-bbf3-4ad6-8dbd-86ff39013a19',
    }).success,
    true,
  );
  for (const bad of [
    { name: 'A', portrait: '' },
    { name: 'x'.repeat(101), portrait: '' },
    { name: 'Aathil', portrait: 'https://example.com/photo.jpg' },
    { name: 'Aathil', portrait: '/media/not-a-uuid' },
    { name: 'Aathil', portrait: 'javascript:alert(1)' },
  ])
    assert.equal(articleAuthorSchema.safeParse(bad).success, false);
});
