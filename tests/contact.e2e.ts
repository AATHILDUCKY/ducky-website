import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import { createHash, randomUUID } from 'node:crypto';
const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const email = `contact-qa-${randomUUID()}@example.com`;
const subject = `Contact workflow ${randomUUID()}`;
const dashboardEmail = `contact-dashboard-qa-${randomUUID()}@example.com`;
test.afterAll(async () => {
  await db.query('DELETE FROM contact_requests WHERE email=ANY($1::text[])', [
    [email, dashboardEmail],
  ]);
  await db.query('DELETE FROM contact_rate_limits WHERE key=ANY($1::text[])', [
    [email, dashboardEmail].map((value) => createHash('sha256').update(value).digest('hex')),
  ]);
  await db.end();
});
test('contact form delivers a private request to the protected admin inbox', async ({
  page,
  browser,
}) => {
  await page.goto('/admin/requests');
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto('/contact');
  await expect(page.getByRole('heading', { name: 'Send me a message.' })).toBeVisible();
  await page.getByLabel('Your name', { exact: true }).fill('Contact QA');
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Subject', { exact: true }).fill(subject);
  await page
    .getByLabel('Message', { exact: true })
    .fill('Please discuss this idea.\n<script>window.contactUnsafe=true</script>');
  const sent = page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/contact'));
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  const submission = await sent;
  await expect(page.locator('.contact-feedback')).toContainText('Your message has been sent');
  await expect(page.getByLabel('Your name', { exact: true })).toHaveValue('');
  let saved = (await db.query('SELECT * FROM contact_requests WHERE email=$1', [email])).rows;
  expect(saved).toHaveLength(1);
  const id = saved[0].id;
  expect(saved[0].status).toBe('new');
  // Replay an identical delivery to simulate a network retry.
  const replay = await page.request.post(submission.url(), {
    headers: submission.headers(),
    data: submission.postDataBuffer()!,
  });
  expect(replay.ok()).toBeTruthy();
  expect(
    (await db.query('SELECT count(*)::int AS n FROM contact_requests WHERE email=$1', [email]))
      .rows[0].n,
  ).toBe(1);
  await page.goto(`/admin/requests/${id}`);
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel('Username', { exact: true }).fill(process.env.ADMIN_USERNAME!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Enter your studio' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator('.contact-inbox-shortcut')).toContainText('new contact');
  await page.goto('/admin/requests');
  await page.getByRole('searchbox', { name: 'Search requests', exact: true }).fill(subject);
  await page.getByRole('button', { name: 'Search requests', exact: true }).click();
  await expect(page.locator('.request-row')).toHaveCount(1);
  await page.locator('.request-row').click();
  await expect(page.locator('.request-message-body')).toContainText('<script>');
  expect(
    await page.evaluate(() =>
      Boolean((window as Window & { contactUnsafe?: boolean }).contactUnsafe),
    ),
  ).toBeFalsy();
  await expect(page.getByRole('link', { name: 'Reply by email' })).toHaveAttribute(
    'href',
    new RegExp(`^mailto:${email}`),
  );
  const second = await page.context().newPage();
  await second.goto(`/admin/requests/${id}`);
  await page.getByLabel('Status', { exact: true }).selectOption('in_progress');
  await page.getByLabel('Private note').fill('Private QA follow-up');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status')).toContainText('Request updated');
  await second.getByLabel('Private note').fill('Stale overwrite attempt');
  await second.getByRole('button', { name: 'Save changes' }).click();
  await expect(second.getByRole('status')).toContainText('changed in another window');
  await second.close();
  await page.getByLabel('Status', { exact: true }).selectOption('resolved');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status')).toContainText('Request updated');
  await expect
    .poll(
      async () =>
        (await db.query('SELECT status FROM contact_requests WHERE id=$1', [id])).rows[0].status,
    )
    .toBe('resolved');
  saved = (await db.query('SELECT * FROM contact_requests WHERE id=$1', [id])).rows;
  expect(saved[0].status).toBe('resolved');
  expect(saved[0].admin_note).toBe('Private QA follow-up');
  await page.goto('/admin/requests?status=resolved&q=' + encodeURIComponent(subject));
  await expect(page.locator('.request-row')).toHaveCount(1);
  await page.goto('/admin/requests?status=new&q=' + encodeURIComponent(subject));
  await expect(page.locator('.request-row')).toHaveCount(0);
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    for (const route of ['/contact', '/admin/requests', `/admin/requests/${id}`]) {
      await page.goto(route);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${route} at ${width}`,
      ).toBeTruthy();
    }
  }
  await page.screenshot({ path: 'artifacts/contact-admin-detail.png', fullPage: true });
  const guest = await browser.newPage();
  await guest.goto('/contact');
  expect(await guest.content()).not.toContain('Private QA follow-up');
  for (const route of ['/admin/requests', `/admin/requests/${id}`]) {
    await guest.goto(route);
    await expect(guest).toHaveURL(/\/admin\/login/);
  }
  await guest.goto('/contact');
  const send = async (autofilledWebsite = false) => {
    await guest.getByLabel('Your name', { exact: true }).fill('Contact QA');
    await guest.getByLabel('Email address', { exact: true }).fill(email);
    await guest.getByLabel('Subject', { exact: true }).fill(subject);
    await guest
      .getByLabel('Message', { exact: true })
      .fill('A test contact request with enough detail.');
    if (autofilledWebsite)
      await guest.locator('.contact-request-form').evaluate((form: HTMLFormElement) => {
        // An old tab or browser autofill may still include the retired website field.
        let input = form.querySelector<HTMLInputElement>('input[name="website"]');
        if (!input) {
          input = document.createElement('input');
          input.type = 'hidden';
          input.name = 'website';
          form.append(input);
        }
        input.value = 'https://example.com';
      });
    const response = guest.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().endsWith('/contact'),
    );
    await guest.getByRole('button', { name: 'Send message', exact: true }).click();
    await response;
    await expect(guest.getByRole('button', { name: 'Send message', exact: true })).toBeEnabled();
  };
  await send(true);
  await expect(guest.locator('.contact-feedback')).toContainText('Your message has been sent');
  expect(
    (await db.query('SELECT count(*)::int AS n FROM contact_requests WHERE email=$1', [email]))
      .rows[0].n,
    'A valid message must be saved even when autofill includes a website field',
  ).toBe(2);
  await page.goto('/admin/requests?q=' + encodeURIComponent(subject));
  await expect(page.locator('.request-row')).toHaveCount(2);
  await guest.goto('/contact');
  for (let i = 0; i < 3; i++) {
    await send();
    await expect(guest.locator('.contact-feedback')).toContainText('Your message has been sent');
    await expect(guest.getByLabel('Your name', { exact: true })).toHaveValue('');
  }
  await send();
  await expect(guest.locator('.contact-feedback')).toContainText('Too many messages');
  await expect(guest.getByLabel('Message', { exact: true })).toHaveValue(
    'A test contact request with enough detail.',
  );
  expect(
    (await db.query('SELECT count(*)::int AS n FROM contact_requests WHERE email=$1', [email]))
      .rows[0].n,
  ).toBe(5);
  await guest.setViewportSize({ width: 390, height: 844 });
  await guest.evaluate(() => window.scrollTo(0, 0));
  await guest.screenshot({ path: 'artifacts/contact-form-mobile.png', fullPage: true });
  await guest.close();
});

test('an open admin dashboard receives contact requests from another visitor', async ({
  page,
  browser,
}) => {
  await page.clock.install();
  await page.goto('/admin/login');
  await page.getByLabel('Username', { exact: true }).fill(process.env.ADMIN_USERNAME!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Enter your studio' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  const initialCount = (
    await db.query("SELECT count(*)::int AS count FROM contact_requests WHERE status='new'")
  ).rows[0].count;
  await expect(page.locator('.contact-inbox-shortcut strong')).toHaveText(
    `${initialCount} new contact ${initialCount === 1 ? 'request' : 'requests'}`,
  );
  const visitor = await browser.newPage();
  try {
    await visitor.goto('/contact');
    const sendMessage = async () => {
      await visitor.getByLabel('Your name', { exact: true }).fill('Dashboard Contact QA');
      await visitor.getByLabel('Email address', { exact: true }).fill(dashboardEmail);
      await visitor.getByLabel('Subject', { exact: true }).fill('Dashboard delivery check');
      await visitor
        .getByLabel('Message', { exact: true })
        .fill('This message should appear in the already open admin dashboard.');
      await visitor.getByRole('button', { name: 'Send message', exact: true }).click();
      await expect(visitor.locator('.contact-feedback')).toContainText(
        'Your message has been sent',
      );
      await expect(visitor.getByLabel('Your name', { exact: true })).toHaveValue('');
    };
    const expectCount = async (count: number) => {
      await expect(page.locator('.contact-inbox-shortcut strong')).toHaveText(
        `${count} new contact ${count === 1 ? 'request' : 'requests'}`,
        { timeout: 10_000 },
      );
      await expect(page.locator('.inbox-nav-count')).toHaveAttribute(
        'aria-label',
        `${count} new requests`,
      );
    };

    await sendMessage();
    await page.clock.fastForward(30_000);
    await expectCount(initialCount + 1);

    await sendMessage();
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expectCount(initialCount + 2);

    await sendMessage();
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expectCount(initialCount + 3);

    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
    }
    await page.getByRole('link', { name: /Open inbox/ }).click();
    await expect(page.locator('.request-row').filter({ hasText: dashboardEmail })).toHaveCount(3);
  } finally {
    await visitor.close();
  }
});
