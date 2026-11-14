import { test, expect } from '@playwright/test';

test.skip(
  !/^\d+$/.test(process.env.NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT || ''),
  'Set an ad slot in the test server build environment.',
);

const adStub = `
  window.adsbygoogle = { push() {
    const unit = document.querySelector('ins.adsbygoogle:not([data-adsbygoogle-status])');
    if (!unit) throw new Error('Ad requested twice');
    unit.dataset.adsbygoogleStatus = 'done';
    unit.dataset.adStatus = 'filled';
    const frame = document.createElement('iframe');
    frame.title = 'Advertisement preview';
    frame.style.cssText = 'width:100%;height:100%;border:0;display:block';
    frame.srcdoc = '<html><body style="margin:0;background:#151515;color:#a0a0a0;display:grid;place-items:center;height:100vh;font:12px system-ui">Ad placement preview</body></html>';
    unit.appendChild(frame);
    document.documentElement.dataset.adRequests = String(Number(document.documentElement.dataset.adRequests || 0) + 1);
  }};
  // A Google-trusted script may load changing serving domains under strict-dynamic.
  const child = document.createElement('script');
  child.src = 'https://ad-serving.example.test/child.js';
  document.head.appendChild(child);
`;

test.beforeEach(async ({ page }) => {
  // Never request live ads or analytics while testing.
  await page.route('https://**/*', async (route) => {
    const url = new URL(route.request().url());
    if (
      url.hostname === 'pagead2.googlesyndication.com' &&
      url.pathname.endsWith('/adsbygoogle.js')
    )
      return route.fulfill({ contentType: 'text/javascript', body: adStub });
    if (url.hostname === 'ad-serving.example.test')
      return route.fulfill({
        contentType: 'text/javascript',
        body: "document.documentElement.dataset.adChildLoaded = 'true';",
      });
    if (url.hostname === 'www.googletagmanager.com')
      return route.fulfill({ contentType: 'text/javascript', body: '' });
    return route.abort();
  });
});

test('home has no ad script or placement; publisher verification is available', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await expect(page.locator('.signature-avatar')).toBeVisible();
  expect(await page.locator('meta[name="google-adsense-account"]').getAttribute('content')).toBe(
    'ca-pub-6405478732026557',
  );
  await expect(page.locator('ins.adsbygoogle')).toHaveCount(0);
  await expect(page.locator('#google-adsense')).toHaveCount(0);
  expect((await request.get('/')).headers()['content-security-policy']).not.toContain(
    'strict-dynamic',
  );
  expect(await (await request.get('/ads.txt')).text()).toBe(
    'google.com, pub-6405478732026557, DIRECT, f08c47fec0942fa0\n',
  );
});

test('ad pages use fresh nonces and load analytics and vendor descendants', async ({
  page,
  request,
}) => {
  const first = await request.get('/about');
  const second = await request.get('/about');
  const firstPolicy = first.headers()['content-security-policy'];
  const secondPolicy = second.headers()['content-security-policy'];
  expect(firstPolicy).toContain("'strict-dynamic'");
  expect(firstPolicy).not.toBe(secondPolicy);
  const nonce = firstPolicy.match(/'nonce-([^']+)'/)?.[1];
  expect(nonce).toBeTruthy();
  expect(await first.text()).toContain('nonce="' + nonce + '"');
  await page.goto('/about');
  await page.locator('.display-ad').scrollIntoViewIfNeeded();
  await expect(page.locator('html')).toHaveAttribute('data-ad-requests', '1');
  await expect(page.locator('html')).toHaveAttribute('data-ad-child-loaded', 'true');
  await expect(page.locator('#google-analytics-init')).toBeAttached();
  expect(
    await page
      .locator('#google-analytics-init')
      .evaluate((script: HTMLScriptElement) => script.nonce),
  ).toBeTruthy();
});

test('one responsive ad fits narrow, phone, tablet, and desktop viewports', async ({ page }) => {
  for (const [width, height] of [
    [320, 100],
    [390, 100],
    [768, 60],
    [1280, 90],
  ]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/about');
    const placement = page.getByRole('complementary', { name: 'Advertisement', exact: true });
    await placement.scrollIntoViewIfNeeded();
    await expect(page.locator('html')).toHaveAttribute('data-ad-requests', '1');
    await expect(placement).toBeVisible();
    await expect(page.locator('ins.adsbygoogle')).toHaveCount(1);
    const bounds = await page.locator('ins.adsbygoogle').boundingBox();
    expect(bounds?.height).toBe(height);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
  }
});

test('navigation preserves ad lifecycle and returning home removes vendor code', async ({
  page,
}) => {
  await page.goto('/about');
  await page.locator('.display-ad').scrollIntoViewIfNeeded();
  await expect(page.locator('html')).toHaveAttribute('data-ad-requests', '1');
  await page.locator('.desktop-nav a[href="/tools"]').click();
  await expect(page).toHaveURL(/\/tools$/);
  await page.locator('.display-ad').scrollIntoViewIfNeeded();
  await expect(page.locator('html')).toHaveAttribute('data-ad-requests', '2');
  await expect(page.locator('#google-adsense')).toHaveCount(1);
  await page.locator('.site-header a.brand').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.signature-avatar')).toBeVisible();
  await expect(page.locator('#google-adsense')).toHaveCount(0);
  await expect(page.locator('ins.adsbygoogle')).toHaveCount(0);
  await page.locator('.desktop-nav a[href="/about"]').click();
  await expect(page).toHaveURL(/\/about$/);
  await page.locator('.display-ad').scrollIntoViewIfNeeded();
  await expect(page.locator('html')).toHaveAttribute('data-ad-requests', '1');
});

test('a script failure hides the empty placement', async ({ page }) => {
  await page.route('**/pagead/js/adsbygoogle.js?*', (route) => route.abort());
  await page.goto('/about');
  await page.locator('.display-ad').scrollIntoViewIfNeeded();
  await expect(page.locator('.display-ad')).toBeHidden();
});

test('all public content routes remain usable with the ad policy', async ({ page }) => {
  for (const path of [
    '/tools',
    '/contact',
    '/research',
    '/blog',
    '/blog/building-testing-always-learning',
    '/forum',
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator('main h1').first()).toBeVisible();
    const unit = page.locator('ins.adsbygoogle');
    if (await unit.count()) {
      await unit.scrollIntoViewIfNeeded();
      await expect(page.locator('html')).toHaveAttribute('data-ad-requests', '1');
    }
    if (path === '/tools') {
      await page.getByRole('searchbox').fill('JWT');
      await expect(page.getByRole('heading', { name: 'JWT Token Analyzer' })).toBeVisible();
    }
  }
  await page.goto('/blog/missing-ad-test-article');
  await expect(page.locator('ins.adsbygoogle')).toHaveCount(0);
  await expect(page.locator('#google-adsense')).toHaveCount(0);
});

test('unfilled ads collapse and browser Back cannot carry ads home', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.signature-avatar')).toBeVisible();
  await page.locator('.desktop-nav a[href="/about"]').click();
  await page.locator('.display-ad').scrollIntoViewIfNeeded();
  await expect(page.locator('html')).toHaveAttribute('data-ad-requests', '1');
  await page
    .locator('ins.adsbygoogle')
    .evaluate((unit) => unit.setAttribute('data-ad-status', 'unfilled'));
  await expect(page.locator('.display-ad')).toBeHidden();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.signature-avatar')).toBeVisible();
  await expect(page.locator('#google-adsense')).toHaveCount(0);
});
