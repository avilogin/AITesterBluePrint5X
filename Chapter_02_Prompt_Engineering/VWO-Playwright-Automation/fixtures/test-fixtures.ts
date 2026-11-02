import { test as base, expect, Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

type Fixtures = {
  loginPage: LoginPage;
  diagnostics: void;
};

export type MockedAuthResponse = {
  status: number;
  body: string;
  /** When given, the response is held until this promise resolves (to observe loading states). */
  holdUntil?: Promise<void>;
};

/**
 * Answers the app's POST /login with a recorded server response instead of contacting the server.
 * Other requests (page assets, GET routes) pass through untouched.
 */
export async function mockLoginResponse(page: Page, response: MockedAuthResponse): Promise<void> {
  await page.route('**/login', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    if (response.holdUntil) await response.holdUntil;
    await route.fulfill({ status: response.status, contentType: 'application/json', body: response.body });
  });
}

export const test = base.extend<Fixtures>({
  // Opens a fresh login page for every test; the context and page are created and closed by Playwright.
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await use(loginPage);
  },

  // Collects browser console errors and failed requests; attaches them to the report when a test fails.
  diagnostics: [
    async ({ page }, use, testInfo) => {
      const logs: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') logs.push(`[console.error] ${msg.text()}`);
      });
      page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));
      page.on('requestfailed', (req) => logs.push(`[requestfailed] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`));

      await use();

      if (testInfo.status !== testInfo.expectedStatus) {
        await testInfo.attach('browser-diagnostics.log', {
          body: [`URL at failure: ${page.url()}`, ...logs].join('\n') || 'No browser errors captured',
          contentType: 'text/plain',
        });
      }
    },
    { auto: true },
  ],
});

export { expect };
