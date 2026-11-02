import * as allure from 'allure-js-commons';
import { test, expect, mockLoginResponse } from '../fixtures/test-fixtures';
import { ENV, hasValidCredentials, ROUTES, URL_PATTERNS, MESSAGES, INVALID_DATA, SERVER_RESPONSES } from '../utils/test-data';
import { traceToPrd } from '../utils/prd';

type FailureCase = {
  title: string;
  email: string;
  password: string;
  needsRegisteredEmail?: boolean;
};

const failureCases: FailureCase[] = [
  { title: 'unregistered email', email: INVALID_DATA.unregisteredEmail, password: INVALID_DATA.samplePassword },
  { title: 'invalid password for a registered email', email: ENV.validEmail, password: INVALID_DATA.wrongPassword, needsRegisteredEmail: true },
  { title: 'both credentials invalid', email: INVALID_DATA.unregisteredEmail, password: INVALID_DATA.wrongPassword },
  { title: 'empty email', email: INVALID_DATA.empty, password: INVALID_DATA.samplePassword },
  { title: 'empty password', email: INVALID_DATA.unregisteredEmail, password: INVALID_DATA.empty },
  { title: 'both fields empty', email: INVALID_DATA.empty, password: INVALID_DATA.empty },
];

test.describe('VWO Login - negative scenarios', () => {
  test.beforeEach(async ({}, testInfo) => {
    await allure.epic('VWO Login Dashboard');
    await allure.feature('Login - negative');
    await allure.parameter('browser', testInfo.project.name);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      console.error(`[teardown] "${testInfo.title}" ended as ${testInfo.status} at ${page.url()}`);
    }
  });

  // Real failed logins against the server. Kept to the minimum: the server throttles after ~5
  // failures per IP (HTTP 429), see playwright.config.ts. No retries: a retry after 429 only adds attempts.
  test.describe('server-validated failures', { tag: '@auth-attempt' }, () => {
    test.describe.configure({ retries: 0 });

    for (const data of failureCases) {
      test(`should reject login with ${data.title}`, async ({ loginPage, page }) => {
        test.skip(!!data.needsRegisteredEmail && !hasValidCredentials(), 'Needs a registered VWO_EMAIL in .env');
        await traceToPrd(
          'User Input Validation › Error Handling',
          `Login with ${data.title} is rejected by the server (HTTP 401), shows the authentication error and stays on the login page.`,
        );

        const status = await loginPage.login(data.email, data.password);

        expect(status).toBe(401);
        expect(await loginPage.getValidationMessage()).toBe(MESSAGES.authFailure);
        await expect(page).toHaveURL(URL_PATTERNS.login);
      });
    }

  });

  // UI reaction to an authentication failure. The server's real 401 response (captured from the
  // live app) is replayed, so these run on every browser without adding failed logins.
  test.describe('UI handling of a rejected login', () => {
    test.beforeEach(async ({ page }) => {
      await mockLoginResponse(page, SERVER_RESPONSES.invalidUser);
    });

    test('should flag an invalid email format', async ({ loginPage, page }) => {
      await traceToPrd('User Input Validation › Email Format Verification', 'A malformed email is invalid per the browser email constraint; the form still submits it and shows the authentication error.');
      await loginPage.enterEmail(INVALID_DATA.malformedEmail);
      // Checked via the constraint-validation API because the app shows no inline message for this case.
      expect(await loginPage.emailInput.evaluate((el: HTMLInputElement) => el.validity.typeMismatch)).toBe(true);

      const loginRequest = page.waitForRequest((req) => req.method() === 'POST' && new URL(req.url()).pathname === '/login');
      await loginPage.login(INVALID_DATA.malformedEmail, INVALID_DATA.samplePassword);
      // Documents finding: no client-side block, the malformed address reaches the server.
      expect((await loginRequest).postData() ?? '').toContain(INVALID_DATA.malformedEmail);
      await expect(loginPage.notificationMessage).toHaveText(MESSAGES.authFailure);
      await expect(page).toHaveURL(URL_PATTERNS.login);
    });

    test('should display the authentication error in a warning notification', async ({ loginPage }) => {
      await traceToPrd('Error Recovery Flow › Error Identification', 'Authentication failure is shown in a warning notification that is hidden before submit.');
      await expect(loginPage.notificationMessage).toBeHidden();
      await loginPage.login(INVALID_DATA.unregisteredEmail, INVALID_DATA.wrongPassword);
      await expect(loginPage.notificationBox).toBeVisible();
      await expect(loginPage.notificationBox).toHaveClass(/notification-box--warning/);
      await expect(loginPage.notificationMessage).toHaveText(MESSAGES.authFailure);
    });

    test('should keep the password masked after a failed login', async ({ loginPage }) => {
      await traceToPrd('Security Specifications › Data Protection', 'Password input stays type=password before and after a failed attempt.');
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
      await loginPage.login(INVALID_DATA.unregisteredEmail, INVALID_DATA.wrongPassword);
      await expect(loginPage.notificationMessage).toBeVisible();
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    });

    test('should not grant dashboard access after a failed login', async ({ loginPage, page }) => {
      await traceToPrd('Security Metrics › Unauthorized Access', 'After failed authentication, requesting the dashboard route returns the user to login.');
      await loginPage.login(INVALID_DATA.unregisteredEmail, INVALID_DATA.wrongPassword);
      await expect(loginPage.notificationMessage).toBeVisible();

      await page.goto(ROUTES.dashboard, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(URL_PATTERNS.login);
      await expect(loginPage.emailInput).toBeVisible();
    });

    test('should submit the form from the keyboard', async ({ loginPage, page }) => {
      await traceToPrd('Accessibility Features › Keyboard Navigation', 'Tab moves from email to password; Enter on the focused Sign in button submits the form.');
      await loginPage.enterEmail(INVALID_DATA.unregisteredEmail);
      await page.keyboard.press('Tab');
      await expect(loginPage.passwordInput).toBeFocused();
      await page.keyboard.type(INVALID_DATA.wrongPassword);

      await loginPage.signInButton.focus();
      await page.keyboard.press('Enter');
      await expect(loginPage.notificationMessage).toHaveText(MESSAGES.authFailure);
    });
  });

  test('should show a loading state while authentication is in progress', async ({ loginPage, page }) => {
    await traceToPrd('Interface Design › Loading States', 'Sign in button gets the is-in-action state while the POST /login request is pending.');
    let release!: () => void;
    await mockLoginResponse(page, { ...SERVER_RESPONSES.invalidUser, holdUntil: new Promise<void>((resolve) => (release = resolve)) });

    // Submitted step by step: login() would wait for the response this test is holding back.
    await loginPage.enterEmail(INVALID_DATA.unregisteredEmail);
    await loginPage.enterPassword(INVALID_DATA.wrongPassword);
    await loginPage.clickSignIn();
    await expect(loginPage.signInButton).toHaveClass(/is-in-action/);

    release();
    await expect(loginPage.notificationMessage).toHaveText(MESSAGES.authFailure);
    await expect(loginPage.signInButton).not.toHaveClass(/is-in-action/);
  });

  test('should inform the user when the server rate-limits login attempts', async ({ loginPage, page }) => {
    test.fail(true, 'Known defect (verified 2026-11-02): on HTTP 429 the UI shows no message and clears the password.');
    await traceToPrd('Compliance Standards › Rate Limiting / User Input Validation › Error Handling', 'A throttled (HTTP 429) login attempt should give the user clear, actionable feedback.');
    await mockLoginResponse(page, SERVER_RESPONSES.rateLimited);

    await loginPage.enterEmail(INVALID_DATA.unregisteredEmail);
    await loginPage.enterPassword(INVALID_DATA.wrongPassword);
    await loginPage.clickSignIn();
    await expect(loginPage.notificationMessage).toBeVisible({ timeout: 10_000 });
  });

  test('should validate fields on blur', async () => {
    await traceToPrd('User Input Validation › Real-time Validation', 'Field validation on blur provides immediate feedback.');
    test.fixme(true, 'PRD requires on-blur validation; the live app shows no inline message on blur (verified 2026-11-02).');
  });
});
