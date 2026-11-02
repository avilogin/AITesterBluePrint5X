import { defineConfig, devices } from '@playwright/test';
import { ENV } from './utils/test-data';

const crossBrowserAuth = process.env.CROSS_BROWSER_AUTH === 'true';
const runPerformance = process.env.RUN_PERF === 'true';

// @performance tests depend on the local network, so they are opt-in (RUN_PERF=true).
const excluded = (includeAuth: boolean): RegExp | undefined => {
  const tags = [...(includeAuth ? [] : ['@auth-attempt']), ...(runPerformance ? [] : ['@performance'])];
  return tags.length ? new RegExp(tags.join('|')) : undefined;
};

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry absorbs the live page's occasional A/B-test re-render; retried passes are reported as "flaky".
  retries: 1,
  // Kept low on purpose: the login page is heavy (third-party media/analytics), and every
  // @auth-attempt test is a real failed login against production. The server rate-limits
  // repeated failures per IP (verified: HTTP 429 "Too many requests", then captcha).
  workers: 2,
  timeout: 60_000,
  expect: { timeout: 15_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['allure-playwright', { resultsDir: 'allure-results', detail: true, suiteTitle: true }],
  ],

  use: {
    baseURL: ENV.baseURL,
    headless: true,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  // Real login submissions (@auth-attempt) run on Chromium only by default to stay under the
  // server's rate limit. Set CROSS_BROWSER_AUTH=true to run them on Firefox and WebKit too.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, grepInvert: excluded(true) },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, grepInvert: excluded(crossBrowserAuth) },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, grepInvert: excluded(crossBrowserAuth) },
  ],

  outputDir: 'test-results',
});
