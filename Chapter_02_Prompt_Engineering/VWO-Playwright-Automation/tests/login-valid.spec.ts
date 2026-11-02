import * as allure from 'allure-js-commons';
import { test, expect } from '../fixtures/test-fixtures';
import { ENV, hasValidCredentials, ROUTES, URL_PATTERNS, VIEWPORTS, INVALID_DATA, PERFORMANCE } from '../utils/test-data';
import { traceToPrd } from '../utils/prd';

test.describe('VWO Login - positive scenarios', () => {
  test.beforeAll(async () => {
    if (!hasValidCredentials()) {
      console.warn('[setup] VWO_EMAIL / VWO_PASSWORD not set: authenticated tests will be skipped.');
    }
  });

  test.beforeEach(async ({}, testInfo) => {
    await allure.epic('VWO Login Dashboard');
    await allure.feature('Login - positive');
    await allure.parameter('browser', testInfo.project.name);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      console.error(`[teardown] "${testInfo.title}" ended as ${testInfo.status} at ${page.url()}`);
    }
  });

  test('should navigate to the login page', async ({ loginPage, page }) => {
    await traceToPrd('User Journey › Discovery', 'User can reach the login page over HTTPS; URL and document title match the live application.');
    await expect(page).toHaveURL(URL_PATTERNS.login);
    await expect(page).toHaveTitle('Login - Wingify');
    expect(page.url().startsWith('https://')).toBeTruthy();
  });

  test('should display all login page elements with unique locators', async ({ loginPage }) => {
    await traceToPrd('Existing Features › Standard Authentication Fields', 'Every login control is rendered and each XPath resolves to exactly one element.');
    const elements = {
      'Email input': loginPage.emailInput,
      'Password input': loginPage.passwordInput,
      'Password visibility toggle': loginPage.passwordVisibilityToggle,
      'Remember Me label': loginPage.rememberMeLabel,
      'Sign in button': loginPage.signInButton,
      'Forgot Password button': loginPage.forgotPasswordButton,
      'Free trial link': loginPage.freeTrialLink,
      'Google sign-in button': loginPage.googleSignInButton,
      'SSO sign-in button': loginPage.ssoSignInButton,
      'Passkey sign-in button': loginPage.passkeySignInButton,
    };
    for (const [name, locator] of Object.entries(elements)) {
      await test.step(`${name} is unique and visible`, async () => {
        await loginPage.assertUnique(locator, name);
        await expect(locator).toBeVisible();
      });
    }
    await expect(loginPage.signInButton).toBeEnabled();
  });

  test('should auto-focus the email field on page load', async ({ loginPage }) => {
    await traceToPrd('Interface Design › Auto-focus', 'The first input (email) receives focus automatically when the page loads.');
    await expect(loginPage.emailInput).toBeFocused();
  });

  test('should accept input in the email field', async ({ loginPage }) => {
    await traceToPrd(
      'User Input Validation › Email Format Verification',
      'Email field is type="email" (browser format validation and the email keyboard on mobile), has the expected placeholder and keeps the typed value.',
    );
    await expect(loginPage.emailInput).toHaveAttribute('type', 'email');
    await expect(loginPage.emailInput).toHaveAttribute('placeholder', 'Enter email ID');
    await loginPage.enterEmail(INVALID_DATA.unregisteredEmail);
    await expect(loginPage.emailInput).toHaveValue(INVALID_DATA.unregisteredEmail);
  });

  test('should accept input in the password field and toggle visibility', async ({ loginPage }) => {
    await traceToPrd('Existing Features › Standard Authentication Fields', 'Password is masked by default; the eye toggle reveals and re-masks it.');
    await expect(loginPage.passwordInput).toHaveAttribute('placeholder', 'Enter password');
    await loginPage.enterPassword(INVALID_DATA.samplePassword);
    await expect(loginPage.passwordInput).toHaveValue(INVALID_DATA.samplePassword);
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');

    await loginPage.togglePasswordVisibility();
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');
    await loginPage.togglePasswordVisibility();
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
  });

  test('should expose accessible names for screen readers', async ({ loginPage }) => {
    await traceToPrd('Accessibility Features › Screen Reader Support', 'Form controls have accessible names (labels / ARIA labels) that assistive technology can announce.');
    await expect(loginPage.emailInput).toHaveAccessibleName('Email address');
    await expect(loginPage.passwordInput).toHaveAccessibleName('Password');
    await expect(loginPage.passwordVisibilityToggle).toHaveAccessibleName('Toggle password visibility');
    await expect(loginPage.signInButton).toHaveAccessibleName('Sign in');
  });

  test('should toggle the Remember Me checkbox via its label', async ({ loginPage }) => {
    await traceToPrd('Existing Features › Remember Me Functionality / Interface Design › Clickable Labels', 'Remember Me is unchecked by default and can be checked and unchecked by clicking its label.');
    await expect(loginPage.rememberMeCheckbox).not.toBeChecked();
    await loginPage.setRememberMe(true);
    await expect(loginPage.rememberMeCheckbox).toBeChecked();
    await loginPage.setRememberMe(false);
    await expect(loginPage.rememberMeCheckbox).not.toBeChecked();
  });

  test('should navigate to Forgot Password view and back', async ({ loginPage, page }) => {
    await traceToPrd('Password Management › Forgot Password Flow', 'Forgot Password? opens the reset view with its own email field; Back returns to the login form.');
    await loginPage.openForgotPassword();
    await expect(page).toHaveURL(URL_PATTERNS.forgotPassword);
    await expect(loginPage.forgotPasswordEmailInput).toBeVisible();

    await loginPage.backToLogin();
    await expect(page).toHaveURL(URL_PATTERNS.login);
    await expect(loginPage.emailInput).toBeVisible();
  });

  test('should open the SSO sign-in view', async ({ loginPage, page }) => {
    await traceToPrd('Login Process › Single Sign-On (SSO)', 'Sign in using SSO opens the SSO view with an email field; Back returns to the login form.');
    await loginPage.openSsoView();
    await expect(page).toHaveURL(URL_PATTERNS.sso);
    await expect(loginPage.ssoEmailInput).toBeVisible();

    await loginPage.backToLogin();
    await expect(loginPage.emailInput).toBeVisible();
  });

  test('should open free trial registration in a new tab', async ({ loginPage, context }) => {
    await traceToPrd('Existing Features › Account Registration Link', 'Start a FREE TRIAL opens the free-trial signup page in a new tab.');
    await expect(loginPage.freeTrialLink).toHaveAttribute('target', '_blank');
    const [trialPage] = await Promise.all([context.waitForEvent('page'), loginPage.freeTrialLink.click()]);
    await expect(trialPage).toHaveURL(URL_PATTERNS.freeTrial);
    await trialPage.close();
  });

  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    test(`should render the login form on ${name} viewport`, async ({ page, loginPage }) => {
      await traceToPrd('Interface Design › Responsive Design', `Core login controls stay visible and inside the viewport at ${viewport.width}x${viewport.height}.`);
      await page.setViewportSize(viewport);
      for (const locator of [loginPage.emailInput, loginPage.passwordInput, loginPage.signInButton]) {
        await locator.scrollIntoViewIfNeeded();
        await expect(locator).toBeInViewport();
      }
    });
  }

  test('should redirect HTTP to HTTPS', async ({ request }) => {
    await traceToPrd('Security Specifications › HTTPS Enforcement', 'A plain-HTTP request to the app is permanently redirected to HTTPS.');
    const httpUrl = ENV.baseURL.replace(/^https:/, 'http:') + '/';
    const response = await request.get(httpUrl, { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(response.headers()['location']).toMatch(/^https:\/\//);
  });

  test('should show a light/dark mode option', async () => {
    await traceToPrd('Branding and Visual Design › Theme Support', 'Light/Dark mode option or announcement banner on the login page.');
    test.fixme(true, 'PRD lists Light/Dark mode; theme-switcher scripts load, but no visible toggle or announcement exists on the login page (verified 2026-11-02).');
  });

  test('should make the login form usable within the PRD load budget', { tag: '@performance' }, async ({ page }) => {
    await traceToPrd('Performance Requirements › Page Load Speed', `Login page DOMContentLoaded within ${PERFORMANCE.pageLoadBudgetMs} ms.`);
    await page.goto(ROUTES.login, { waitUntil: 'domcontentloaded' });
    // Navigation Timing is only reachable from page context. The full "load" event is not used:
    // embedded third-party media can keep it from ever firing.
    const domContentLoadedMs = await page.evaluate(
      () => (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).domContentLoadedEventEnd,
    );
    await allure.parameter('DOMContentLoaded (ms)', String(Math.round(domContentLoadedMs)));
    expect(domContentLoadedMs).toBeLessThanOrEqual(PERFORMANCE.pageLoadBudgetMs);
  });

  test.describe('authenticated flows (require VWO_EMAIL / VWO_PASSWORD)', () => {
    test.skip(!hasValidCredentials(), 'Valid test credentials are not configured in .env');

    test('should log in with valid credentials and reach the dashboard', async ({ loginPage, page }) => {
      await traceToPrd('Platform Integrations › VWO Core Platform', 'Valid credentials authenticate the user and transition to the dashboard.');
      await loginPage.login(ENV.validEmail, ENV.validPassword);
      await expect(page).not.toHaveURL(URL_PATTERNS.login, { timeout: 30_000 });
      await expect(page).toHaveURL(URL_PATTERNS.dashboard); // Inference (low confidence): landing route
      await expect(loginPage.notificationMessage).toBeHidden();
    });

    test('should keep the session when Remember Me is selected', async ({ loginPage, page, context }) => {
      await traceToPrd('Returning User Experience › Quick Access', 'After login with Remember Me, a new tab in the same browser context stays authenticated.');
      await loginPage.login(ENV.validEmail, ENV.validPassword, true);
      await expect(page).not.toHaveURL(URL_PATTERNS.login, { timeout: 30_000 });

      const secondTab = await context.newPage();
      await secondTab.goto(ROUTES.dashboard, { waitUntil: 'domcontentloaded' });
      await expect(secondTab).not.toHaveURL(URL_PATTERNS.login); // Inference (low confidence): persistence across browser restarts is not verifiable here
      await secondTab.close();
    });
  });
});
