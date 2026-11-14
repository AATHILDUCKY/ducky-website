import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: [
    'e2e.spec.ts',
    'contact.e2e.ts',
    'forum.e2e.ts',
    'forum-threads.e2e.ts',
    'author.e2e.ts',
    'branding.e2e.ts',
    'socials.e2e.ts',
  ],
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    headless: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROME_PATH || '/usr/bin/google-chrome',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
    screenshot: 'only-on-failure',
  },
  reporter: 'list',
});
