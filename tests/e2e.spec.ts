import { test, expect, type APIRequestContext } from '@playwright/test';
import { Pool } from 'pg';
import sharp from 'sharp';
import { homepageSchema } from '../lib/homepage-schema';
import { upgradeHomepage } from '../lib/homepage-migration.mjs';
const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const slug = 'e2e-publishing-check';
async function sitemapText(request: APIRequestContext) {
  const index = await (await request.get('/sitemap.xml')).text();
  if (!index.includes('<sitemapindex')) return index;
  const files = [...index.matchAll(/<loc>(.*?)<\/loc>/g)].map(
    (match) => new URL(match[1]).pathname,
  );
  return (
    index +
    (await Promise.all(files.map(async (file) => (await request.get(file)).text()))).join('')
  );
}
test.afterAll(async () => {
  const result = await db.query('DELETE FROM posts WHERE slug=ANY($1) RETURNING cover_id', [
    [slug, 'e2e-block-editor-check', 'e2e-blog-loading-check'],
  ]);
  for (const row of result.rows) {
    if (row.cover_id) await db.query('DELETE FROM media WHERE id=$1', [row.cover_id]);
  }
  await db.end();
});
test('public pages render server content, correct metadata, and mobile layouts', async ({
  page,
  request,
}) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('Security Engineer.');
  expect(html).toContain('JWT Token Analyzer');
  expect(html).toContain('application/ld+json');
  for (const route of ['/about', '/research', '/tools', '/blog', '/contact']) {
    const r = await request.get(route);
    expect(r.status(), route).toBe(200);
    expect(await r.text()).toContain('rel="canonical"');
  }
  await page.goto('/');
  await expect(page.locator('.signature-avatar')).toBeVisible();
  await page.goto('/tools');
  await page.getByRole('searchbox').fill('JWT');
  await expect(page.getByRole('heading', { name: 'JWT Token Analyzer' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'QR Stand Studio' })).not.toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/', '/tools', '/research', '/blog', '/about', '/contact']) {
    await page.goto(route);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      route,
    ).toBeTruthy();
  }
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
});
test('protected admin, image budget, Markdown publishing, sitemap updates, and unpublishing', async ({
  page,
  request,
}) => {
  const upload = await request.post('/api/upload', { data: 'invalid' });
  expect(upload.status()).toBe(401);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
  expect(await page.locator('meta[name="robots"]').getAttribute('content')).toContain('noindex');
  await page
    .getByRole('textbox', { name: 'Username', exact: true })
    .fill(process.env.ADMIN_USERNAME!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Enter your studio' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/admin/posts/new');
  await page.getByRole('textbox', { name: 'Post title', exact: true }).fill('E2E publishing check');
  await page
    .getByRole('textbox', { name: 'Post excerpt', exact: true })
    .fill('A temporary post to verify publishing and search metadata.');
  await page.getByRole('button', { name: 'Markdown', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Markdown content', exact: true })
    .fill(
      '## A verified heading\n\nA **bold statement** and a [safe link](https://example.com).\n\n<script>alert("unsafe")</script>',
    );
  await page.getByLabel('Category', { exact: true }).fill('Security research');
  await page.getByLabel('URL slug').fill(slug);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  // A new post navigates to its permanent editor; verify saved state after navigation.
  await expect(page).toHaveURL(/\/admin\/posts\/[0-9a-f-]+$/, { timeout: 15000 });
  await expect
    .poll(
      async () =>
        (await db.query('SELECT status FROM posts WHERE slug=$1', [slug])).rows[0]?.status,
    )
    .toBe('draft');
  expect(await sitemapText(request)).not.toContain(slug);
  expect((await request.get('/blog/' + slug)).status()).toBe(404);
  const image = await sharp({
    create: { width: 1200, height: 800, channels: 3, background: '#779977' },
  })
    .png()
    .toBuffer();
  await page
    .locator('input[type="file"]')
    .nth(1)
    .setInputFiles({ name: 'test-cover.png', mimeType: 'image/png', buffer: image });
  await expect(page.getByRole('img', { name: 'Post cover' })).toBeVisible();
  await page.getByRole('button', { name: 'Publish post', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Published.');
  expect(await sitemapText(request)).toContain('/blog/' + slug);
  expect(await (await request.get('/research')).text()).toContain('E2E publishing check');
  const published = await request.get('/blog/' + slug);
  const html = await published.text();
  expect(published.status()).toBe(200);
  expect(html).toContain('<strong>bold statement</strong>');
  expect(html).not.toContain('<script>alert(');
  expect(html).toContain('BlogPosting');
  const media = await db.query(
    'SELECT octet_length(media.data) AS bytes,media.id FROM media JOIN posts ON posts.cover_id=media.id WHERE posts.slug=$1',
    [slug],
  );
  expect(media.rows[0].bytes).toBeLessThan(50000);
  const imageResponse = await request.get('/media/' + media.rows[0].id);
  expect(imageResponse.headers()['content-type']).toBe('image/webp');
  await page.goto('/blog');
  const writeupCard = page
    .locator('.blog-card')
    .filter({ has: page.getByRole('heading', { name: 'E2E publishing check', exact: true }) });
  const thumbnail = writeupCard.locator('.writeup-thumbnail img');
  await expect(thumbnail).toHaveAttribute('src', '/media/' + media.rows[0].id);
  await expect
    .poll(() => thumbnail.evaluate((image) => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);

  await page.goto('/');
  const homeCard = page
    .locator('.home-writeup-card')
    .filter({ has: page.getByRole('heading', { name: 'E2E publishing check', exact: true }) });
  await expect(homeCard.locator('img')).toHaveAttribute('src', '/media/' + media.rows[0].id);
  await expect(page.locator('#home-writeups .section-header a[href="/blog"]')).toHaveAttribute(
    'href',
    '/blog',
  );

  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    '/admin',
    '/admin/posts',
    '/admin/posts/new',
    '/admin/homepage',
    '/admin/profile',
    '/admin/seo',
  ]) {
    await page.goto(route);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      route,
    ).toBeTruthy();
  }
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Admin navigation' })).toBeVisible();
  await page.getByRole('button', { name: 'Close navigation', exact: true }).click();
  const post = await db.query('SELECT id FROM posts WHERE slug=$1', [slug]);
  await page.goto('/admin/posts/' + post.rows[0].id);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved');
  expect(await sitemapText(request)).not.toContain('/blog/' + slug);
  expect((await request.get('/blog/' + slug)).status()).toBe(404);
});

test('profile and SEO verification persist and refresh public pages', async ({ page, request }) => {
  const originalProfile = (await db.query("SELECT value FROM settings WHERE key='profile'")).rows[0]
    .value;
  const originalSeo = (await db.query("SELECT value FROM settings WHERE key='seo'")).rows[0].value;
  await page.goto('/admin/login');
  await page.getByLabel('Username', { exact: true }).fill(process.env.ADMIN_USERNAME!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Enter your studio' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  try {
    await page.goto('/admin/profile');
    await page
      .getByLabel('Availability label', { exact: true })
      .fill('QA collaboration availability');
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Saved.');
    expect(await (await request.get('/')).text()).toContain('QA collaboration availability');
    await page.getByLabel('Availability label', { exact: true }).fill(originalProfile.availability);
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await expect
      .poll(
        async () =>
          (await db.query("SELECT value FROM settings WHERE key='profile'")).rows[0].value
            .availability,
      )
      .toBe(originalProfile.availability);
    await page.goto('/admin/seo');
    await page.getByLabel('Google verification token').fill('ducky-e2e-verification');
    await page.getByRole('button', { name: 'Save SEO settings', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Saved.');
    expect(await (await request.get('/')).text()).toContain('content="ducky-e2e-verification"');
    await page.getByLabel('Google verification token').fill(originalSeo.googleVerification);
    await page.getByRole('button', { name: 'Save SEO settings', exact: true }).click();
    await expect
      .poll(
        async () =>
          (await db.query("SELECT value FROM settings WHERE key='seo'")).rows[0].value
            .googleVerification,
      )
      .toBe(originalSeo.googleVerification);
  } finally {
    // Restore original settings even if the UI assertion fails.
    await db.query("UPDATE settings SET value=$1 WHERE key='profile'", [
      JSON.stringify(originalProfile),
    ]);
    await db.query("UPDATE settings SET value=$1 WHERE key='seo'", [JSON.stringify(originalSeo)]);
  }
});

test('homepage editor previews private drafts, publishes content and layout, and prevents stale saves', async ({
  page,
  context,
  request,
}) => {
  // This case navigates two editors with unsaved-change protection, including during cleanup.
  page.on('dialog', (dialog) => void dialog.accept());
  const original = await savedHomepage();
  await page.goto('/admin/homepage');
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel('Username', { exact: true }).fill(process.env.ADMIN_USERNAME!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Enter your studio' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/admin/homepage');
  await expect(page.getByRole('heading', { name: 'Your homepage.' })).toBeVisible();
  const stale = await context.newPage();
  stale.on('dialog', (dialog) => void dialog.accept());
  await stale.goto('/admin/homepage');
  const uploaded: string[] = [];
  try {
    await page.getByRole('button', { name: 'Hero & portrait', exact: true }).click();
    await page.getByLabel('Main heading', { exact: true }).fill('QA homepage introduction');
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    const preview = page.frameLocator('iframe[title="Homepage draft preview"]');
    await expect(preview.getByRole('heading', { level: 1 })).toContainText(
      'QA homepage introduction',
    );
    expect(await (await request.get('/')).text()).not.toContain('QA homepage introduction');
    await page.getByRole('button', { name: 'Mobile preview', exact: true }).click();
    await expect(page.locator('iframe')).toHaveCSS('width', '390px');
    await page.getByRole('button', { name: 'Close homepage preview', exact: true }).click();
    await page.getByRole('button', { name: 'Page layout', exact: true }).click();
    await page.getByRole('button', { name: 'Hide Tools section', exact: true }).click();
    await page.getByRole('button', { name: 'Move Contact up', exact: true }).click();
    await page.getByRole('button', { name: 'Highlights', exact: true }).click();
    await page.getByRole('button', { name: 'Add highlight', exact: true }).click();
    await page.getByLabel('Highlight label', { exact: true }).last().fill('QA custom highlight');
    await page.getByRole('button', { name: 'Remove highlight 4', exact: true }).click();
    await page.getByRole('button', { name: 'Brand & navigation', exact: true }).click();
    await page.getByLabel('Brand name', { exact: true }).fill('QA DUCKY');
    const link = page.getByLabel('Navigation link destination', { exact: true }).first();
    await link.fill('javascript:alert(1)');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.locator('.homepage-error-summary')).toContainText('Please check');
    expect(
      (await db.query("SELECT value FROM settings WHERE key='homepage'")).rows[0].value.branding
        .name,
    ).toBe(original.branding.name);
    await link.fill(original.navigation.items[0].href);
    const image = await sharp({
      create: { width: 800, height: 800, channels: 3, background: '#456745' },
    })
      .png()
      .toBuffer();
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: 'homepage-logo.png', mimeType: 'image/png', buffer: image });
    await expect(page.locator('.homepage-image-sample img')).toHaveAttribute('src', /^\/media\//);
    const src = await page.locator('.homepage-image-sample img').getAttribute('src');
    uploaded.push(src!.slice(7));
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Your homepage is updated.');
    const saved = (await db.query("SELECT value FROM settings WHERE key='homepage'")).rows[0].value;
    expect(saved.hero.heading).toBe('QA homepage introduction');
    const publicPage = await context.newPage();
    await publicPage.goto('/');
    await expect(publicPage.getByRole('heading', { level: 1 })).toContainText(
      'QA homepage introduction',
    );
    await expect(publicPage.locator('.site-header .brand-wordmark')).toHaveText('QA DUCKY');
    await expect(publicPage.locator('[data-home-section="tools"]')).toHaveCount(0);
    const order = await publicPage
      .locator('[data-home-section]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-home-section')));
    expect(order.indexOf('contact')).toBeLessThan(order.indexOf('writeups'));
    await publicPage.close();
    const media = (
      await db.query('SELECT octet_length(data) AS bytes FROM media WHERE id=$1', uploaded)
    ).rows[0];
    expect(media.bytes).toBeLessThan(50000);
    expect((await request.get(src!)).headers()['content-type']).toBe('image/webp');
    await stale.getByRole('button', { name: 'Hero & portrait', exact: true }).click();
    await stale.getByLabel('Main heading', { exact: true }).fill('QA stale change');
    await stale.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(stale.locator('.homepage-error-summary')).toContainText('saved in another tab');
    expect(
      (await db.query("SELECT value FROM settings WHERE key='homepage'")).rows[0].value.hero
        .heading,
    ).toBe('QA homepage introduction');
    await page.reload();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByLabel('Editing section', { exact: true }).selectOption('hero');
    await expect(page.getByLabel('Main heading', { exact: true })).toHaveValue(
      'QA homepage introduction',
    );
    for (const panel of [
      'layout',
      'branding',
      'hero',
      'highlights',
      'about',
      'experience',
      'tools',
      'writeups',
      'contact',
      'footer',
    ]) {
      await page.getByLabel('Editing section', { exact: true }).selectOption(panel);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        panel,
      ).toBeTruthy();
    }
  } finally {
    await stale.close();
    // Restore through the real draft recovery + save workflow so public caches are invalidated too.
    await page.evaluate(
      (data) =>
        localStorage.setItem('ducky-homepage-recovery', JSON.stringify({ data, revision: '' })),
      original,
    );
    await page.goto('/admin/homepage');
    const current = await savedHomepage();
    if (JSON.stringify(current) !== JSON.stringify(original)) {
      await expect(page.getByRole('button', { name: 'Restore draft', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Restore draft', exact: true }).click();
      await page.getByRole('button', { name: 'Save changes', exact: true }).click();
      await expect(page.getByRole('status')).toContainText('Your homepage is updated.');
    }
    expect(
      (await db.query("SELECT value FROM settings WHERE key='homepage'")).rows[0].value,
    ).toEqual(original);
    for (const id of uploaded)
      if (!JSON.stringify(original).includes(id))
        await db.query('DELETE FROM media WHERE id=$1', [id]);
  }
});

test('visual blocks parse pasted Markdown, retain code languages, and publish copyable highlighted articles', async ({
  page,
  context,
  request,
}) => {
  await page.goto('/admin/login');
  await page.getByLabel('Username', { exact: true }).fill(process.env.ADMIN_USERNAME!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Enter your studio' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/admin/posts/new');
  await page.getByLabel('Post title', { exact: true }).fill('E2E block editor check');
  await page
    .getByLabel('Post excerpt', { exact: true })
    .fill('A temporary writeup verifying visual Markdown editing and code blocks.');
  const markdown =
    "## A pasted heading\n\nA **bold statement** with a list.\n\n- First item\n- Second item\n\n'''python\ndef greet(name):\n    return 'Hello ' + name\n'''\n\n- [ ] A task\n\n| Item | Value |\n| --- | --- |\n| A | 1 |";
  const blocks = page.getByRole('textbox', { name: 'Writeup block editor', exact: true });
  await expect(blocks).toBeVisible();
  await blocks.evaluate((element, text) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', text);
    element.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }),
    );
  }, markdown);
  await expect(
    blocks.getByRole('heading', { name: 'A pasted heading', exact: true }),
  ).toBeVisible();
  await expect(blocks.locator('strong')).toHaveText('bold statement');
  await expect(blocks.locator('.block-code .hljs-keyword').first()).toBeVisible();
  await expect(blocks.getByRole('combobox', { name: 'Code language' })).toHaveValue('python');
  await expect(blocks.locator('table')).toBeVisible();
  await expect(blocks.locator('input[type="checkbox"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Add block', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Choose a block' })).toBeVisible();
  await page.getByRole('button', { name: 'Close block inserter', exact: true }).click();
  await page.getByRole('button', { name: 'Markdown', exact: true }).click();
  const source = await page.getByLabel('Markdown content', { exact: true }).inputValue();
  expect(source).toContain('```python');
  expect(source).toContain('**bold statement**');
  await page.getByRole('button', { name: 'Visual blocks', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Writeup block editor' }).locator('table'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Publish post', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/posts\/[0-9a-f-]+$/);
  await expect
    .poll(
      async () =>
        (await db.query("SELECT status FROM posts WHERE slug='e2e-block-editor-check'")).rows[0]
          ?.status,
    )
    .toBe('published');
  const response = await request.get('/blog/e2e-block-editor-check');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('hljs-keyword');
  expect(html).toContain('language-python');
  expect(await (await request.get('/')).text()).toContain('E2E block editor check');
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: new URL(process.env.TEST_BASE_URL || 'http://localhost:3000').origin,
  });
  await page.goto('/blog/e2e-block-editor-check');
  await page.getByRole('button', { name: 'Copy code', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Code copied', exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "def greet(name):\n    return 'Hello ' + name",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  const row = (await db.query("SELECT id FROM posts WHERE slug='e2e-block-editor-check'")).rows[0];
  await page.goto('/admin/posts/' + row.id);
  await expect(page.getByRole('textbox', { name: 'Writeup block editor' })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('.form-success')).toContainText('Draft saved');
  expect(await (await request.get('/')).text()).not.toContain('E2E block editor check');
});

async function savedHomepage() {
  const raw = (await db.query("SELECT value FROM settings WHERE key='homepage'")).rows[0].value;
  return homepageSchema.parse(upgradeHomepage(raw));
}
async function openHomepageEditor(page: import('@playwright/test').Page) {
  page.on('dialog', (dialog) => void dialog.accept());
  await page.goto('/admin/login');
  await page.getByLabel('Username', { exact: true }).fill(process.env.ADMIN_USERNAME!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Enter your studio' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/admin/homepage');
}
async function restoreHomepage(
  page: import('@playwright/test').Page,
  original: import('../lib/homepage-schema').Homepage,
) {
  await page.evaluate(
    (data) =>
      localStorage.setItem('ducky-homepage-recovery', JSON.stringify({ data, revision: '' })),
    original,
  );
  await page.goto('/admin/homepage');
  const current = await savedHomepage();
  if (JSON.stringify(current) !== JSON.stringify(original)) {
    await page.getByRole('button', { name: 'Restore draft', exact: true }).click();
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.locator('.form-success')).toContainText('Your homepage is updated');
  }
  expect(await savedHomepage()).toEqual(original);
}

test('all homepage sections save, persist after reload, and render their edited content publicly', async ({
  page,
  context,
  request,
}) => {
  const original = await savedHomepage();
  const uploaded: string[] = [];
  await openHomepageEditor(page);
  try {
    const choose = async (name: string) =>
      page
        .getByRole('navigation', { name: 'Homepage editor sections' })
        .getByRole('button', { name, exact: true })
        .click();
    await choose('Brand & navigation');
    await page.getByLabel('Brand name', { exact: true }).fill('QA Homepage Brand');
    await page.getByLabel('Navigation link text', { exact: true }).first().fill('QA Home');
    await choose('Hero & portrait');
    await expect(page.getByLabel('Main heading', { exact: true })).toHaveAttribute(
      'maxlength',
      '180',
    );
    await expect(page.getByLabel('Introduction', { exact: true })).toHaveAttribute(
      'maxlength',
      '3000',
    );
    await page.getByLabel('Main heading', { exact: true }).fill('QA Home Hero');
    await page
      .getByLabel('Introduction', { exact: true })
      .fill('QA homepage introduction with **clear emphasis**.');
    await page.getByLabel('Portrait description', { exact: true }).fill('QA Homepage Portrait');
    const image = await sharp({
      create: { width: 400, height: 400, channels: 3, background: '#849877' },
    })
      .png()
      .toBuffer();
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: 'homepage-portrait.png', mimeType: 'image/png', buffer: image });
    await expect(page.locator('.homepage-image-sample img')).not.toHaveAttribute(
      'src',
      original.hero.portrait.src,
    );
    await expect(page.locator('.homepage-image-sample img')).toHaveAttribute('src', /^\/media\//);
    const portrait = (await page.locator('.homepage-image-sample img').getAttribute('src'))!;
    uploaded.push(portrait.slice(7));
    await choose('Highlights');
    await page.getByLabel('Value', { exact: true }).first().fill('101+');
    await page
      .getByLabel('Highlight label', { exact: true })
      .first()
      .fill('QA vulnerability highlight');
    await choose('About introduction');
    await page.getByLabel('Section heading', { exact: true }).fill('QA About Heading');
    await page
      .getByLabel('Paragraph 1', { exact: true })
      .fill('QA about paragraph for this homepage.');
    await choose('Experience');
    await page.getByLabel('Role', { exact: true }).first().fill('QA Security Role');
    await page.getByLabel('Company', { exact: true }).first().fill('QA Company');
    await choose('Tools');
    await page.getByLabel('Tool name', { exact: true }).first().fill('QA Homepage Tool');
    await page.getByLabel('Icon', { exact: true }).first().selectOption('shield');
    await choose('Recent writeups');
    await page.getByLabel('Section heading', { exact: true }).fill('QA Recent Writing');
    await page.getByLabel('Number of recent writeups', { exact: true }).selectOption('1');
    await page.getByLabel('See more button text', { exact: true }).fill('QA More Writeups');
    await choose('Contact');
    await page.getByLabel('Contact heading', { exact: true }).fill('QA Contact Heading');
    await page.getByLabel('Contact email', { exact: true }).fill('homepage-qa@example.com');
    await choose('Footer');
    await page.getByLabel('Copyright line', { exact: true }).fill('QA Footer {year}');
    await page.getByRole('button', { name: 'Save homepage', exact: true }).click();
    await expect(page.locator('.form-success')).toContainText('Your homepage is updated');
    const publicPage = await context.newPage();
    await publicPage.goto('/');
    await expect(publicPage.locator('.site-header .brand-wordmark')).toHaveText(
      'QA Homepage Brand',
    );
    await expect(publicPage.getByRole('heading', { level: 1 })).toContainText('QA Home Hero');
    await expect(publicPage.getByRole('img', { name: 'QA Homepage Portrait' })).toHaveAttribute(
      'src',
      portrait,
    );
    for (const title of [
      'QA About Heading',
      'QA Security Role',
      'QA Homepage Tool',
      'QA Recent Writing',
    ])
      await expect(publicPage.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(
      publicPage.getByRole('link', { name: 'QA More Writeups', exact: true }),
    ).toHaveAttribute('href', '/blog');
    await expect(publicPage.locator('a.contact-email')).toHaveAttribute(
      'href',
      'mailto:homepage-qa@example.com',
    );
    await expect(publicPage.locator('.site-footer')).toContainText('QA Footer');
    await publicPage.close();
    await page.reload();
    await choose('Hero & portrait');
    await expect(page.getByLabel('Main heading', { exact: true })).toHaveValue('QA Home Hero');
    await expect(page.getByRole('button', { name: 'Save homepage', exact: true })).toBeDisabled();
    const bytes = (
      await db.query('SELECT octet_length(data) AS bytes FROM media WHERE id=$1', [uploaded[0]])
    ).rows[0].bytes;
    expect(bytes).toBeLessThan(50000);
  } finally {
    await restoreHomepage(page, original);
    for (const id of uploaded)
      if (!JSON.stringify(original).includes(id))
        await db.query('DELETE FROM media WHERE id=$1', [id]);
  }
});

test('homepage validation reveals hidden invalid fields and section reset keeps other edits', async ({
  page,
}) => {
  const original = await savedHomepage();
  await openHomepageEditor(page);
  try {
    await page.getByRole('button', { name: 'Hero & portrait', exact: true }).click();
    await page.getByLabel('Main heading', { exact: true }).fill('QA kept hero edit');
    await page.getByRole('button', { name: 'About introduction', exact: true }).click();
    await page.getByLabel('Section heading', { exact: true }).fill('QA reset this section');
    await page.getByRole('button', { name: 'Reset this section', exact: true }).click();
    await expect(page.getByLabel('Section heading', { exact: true })).toHaveValue(
      original.about.heading,
    );
    await page.getByRole('button', { name: 'Hero & portrait', exact: true }).click();
    await expect(page.getByLabel('Main heading', { exact: true })).toHaveValue('QA kept hero edit');
    await page.getByRole('button', { name: 'Experience', exact: true }).click();
    await page.getByRole('button', { name: 'Expand experience entry 2', exact: true }).click();
    await page.getByLabel('Role', { exact: true }).nth(1).fill('');
    await page.getByRole('button', { name: 'Collapse experience entry 2', exact: true }).click();
    await page.getByRole('button', { name: 'Contact', exact: true }).click();
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByLabel('Role', { exact: true }).nth(1)).toBeFocused();
    await expect(
      page.getByRole('button', { name: 'Collapse experience entry 2', exact: true }),
    ).toHaveAttribute('aria-expanded', 'true');
    await page.getByLabel('Role', { exact: true }).nth(1).fill(original.experience.items[1].role);
    await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
    await page.getByLabel('Find homepage section', { exact: true }).fill('portrait');
    await expect(
      page.getByRole('navigation', { name: 'Homepage editor sections' }).getByRole('button'),
    ).toHaveCount(1);
    await page.getByRole('button', { name: 'Clear section search', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByLabel('Editing section', { exact: true }).selectOption('hero');
    await page.getByLabel('Main heading', { exact: true }).fill('QA mobile unsaved edit');
    await expect(page.getByRole('button', { name: 'Save homepage', exact: true })).toBeInViewport();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
  } finally {
    await restoreHomepage(page, original);
  }
});

test('homepage saves from separate tabs keep unrelated section edits', async ({
  page,
  context,
  request,
}) => {
  const original = await savedHomepage();
  await openHomepageEditor(page);
  const other = await context.newPage();
  other.on('dialog', (dialog) => void dialog.accept());
  await other.goto('/admin/homepage');
  try {
    await page.getByRole('button', { name: 'Hero & portrait', exact: true }).click();
    await page.getByLabel('Main heading', { exact: true }).fill('QA merged hero');
    await other.getByRole('button', { name: 'Footer', exact: true }).click();
    await other.getByLabel('Copyright line', { exact: true }).fill('QA merged footer {year}');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.locator('.form-success')).toContainText('Your homepage is updated');
    await other.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(other.locator('.form-success')).toContainText(
      'Unrelated changes from another tab were kept',
    );
    const current = await savedHomepage();
    expect(current.hero.heading).toBe('QA merged hero');
    expect(current.footer.copyright).toBe('QA merged footer {year}');
    const html = await (await request.get('/')).text();
    expect(html).toContain('QA merged hero');
    expect(html).toContain('QA merged footer');
  } finally {
    await other.close();
    await restoreHomepage(page, original);
  }
});

test('blog dashboard loads the editor and supports creating, reopening, editing, and publishing posts', async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const blog = await request.get('/blog');
  expect(blog.status()).toBe(200);
  await page.goto('/blog');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.goto('/admin/login');
  await page.getByLabel('Username', { exact: true }).fill(process.env.ADMIN_USERNAME!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Enter your studio' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page
    .getByRole('navigation', { name: 'Admin navigation' })
    .getByRole('link', { name: 'Writeups', exact: true })
    .click();
  await page.getByRole('link', { name: 'New writeup', exact: true }).click();
  let editor = page.getByRole('textbox', { name: 'Writeup block editor', exact: true });
  await expect(editor).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.block-editor-loading')).toHaveCount(0);
  await page.getByLabel('Post title', { exact: true }).fill('E2E blog loading check');
  await page
    .getByLabel('Post excerpt', { exact: true })
    .fill('A temporary post checking that the local editor loads and saves correctly.');
  await editor.fill('A first draft written in the visual editor.');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/posts\/[0-9a-f-]+$/);
  const id = (await db.query("SELECT id FROM posts WHERE slug='e2e-blog-loading-check'")).rows[0]
    .id;
  await page.goto('/admin/posts');
  await page.getByRole('link', { name: 'Edit E2E blog loading check', exact: true }).click();
  editor = page.getByRole('textbox', { name: 'Writeup block editor', exact: true });
  await expect(editor).toBeVisible({ timeout: 15000 });
  await expect(editor).toContainText('A first draft written in the visual editor.');
  await editor.fill('An edited draft, saved after reopening the blog editor.');
  await page.getByRole('button', { name: 'Publish post', exact: true }).click();
  await expect(page.locator('.form-success')).toContainText('Published.');
  await expect
    .poll(
      async () => (await db.query('SELECT content FROM posts WHERE id=$1', [id])).rows[0].content,
    )
    .toContain('An edited draft');
  await page.goto('/blog/e2e-blog-loading-check');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E blog loading check');
  await expect(page.locator('.article .prose')).toContainText(
    'An edited draft, saved after reopening',
  );
  await page.goto('/admin/posts/' + id);
  await expect(
    page.getByRole('textbox', { name: 'Writeup block editor', exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('.form-success')).toContainText('Draft saved');
  expect((await request.get('/blog/e2e-blog-loading-check')).status()).toBe(404);
  expect(
    errors.filter((error) => /Content Security Policy|unsafe-eval|ChunkLoadError/.test(error)),
  ).toEqual([]);
});

test('retired pages return 404 and stay absent from navigation, homepage editing, and sitemap', async ({
  page,
  request,
}) => {
  for (const route of [
    '/projects',
    '/projects/duck-leak-scanner',
    '/freelance',
    '/admin/projects',
    '/admin/freelance',
  ]) {
    expect((await request.get(route)).status(), route).toBe(404);
  }
  const sitemap = await sitemapText(request);
  expect(sitemap).not.toContain('/projects');
  expect(sitemap).not.toContain('/freelance');
  await page.goto('/');
  await expect(
    page.locator('[data-home-section="projects"], [data-home-section="freelance"]'),
  ).toHaveCount(0);
  await expect(page.locator('a[href^="/projects"], a[href^="/freelance"]')).toHaveCount(0);
  await openHomepageEditor(page);
  await expect(page.getByRole('button', { name: 'Selected projects', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Freelance', exact: true })).toHaveCount(0);
  await expect(page.locator('a[href^="/admin/projects"], a[href^="/admin/freelance"]')).toHaveCount(
    0,
  );
  await page.goto('/admin');
  await expect(page.locator('.stat-card')).toHaveCount(3);
});
