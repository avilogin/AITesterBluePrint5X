import { Page, Locator, expect } from '@playwright/test';
import { ROUTES } from '../utils/test-data';

/**
 * Page Object for https://app.wingify.com/#/login
 *
 * All locators are relative XPath expressions built from attributes observed in the live DOM
 * (inspected 2026-11-02). data-qa values on this page look auto-generated, so stable ids,
 * aria-labels, onclick handlers and hrefs are preferred.
 */
export class LoginPage {
  readonly page: Page;

  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordVisibilityToggle: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly rememberMeLabel: Locator;
  readonly signInButton: Locator;
  readonly forgotPasswordButton: Locator;
  readonly forgotPasswordEmailInput: Locator;
  readonly freeTrialLink: Locator;
  readonly googleSignInButton: Locator;
  readonly ssoSignInButton: Locator;
  readonly passkeySignInButton: Locator;
  readonly ssoEmailInput: Locator;
  readonly backToLoginButton: Locator;
  readonly notificationBox: Locator;
  readonly notificationMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.emailInput = page.locator("xpath=//input[@id='login-username']");
    this.passwordInput = page.locator("xpath=//input[@id='login-password']");
    this.passwordVisibilityToggle = page.locator(
      "xpath=//button[@aria-label='Toggle password visibility' and @onclick='login.togglePasswordVisibility()']",
    );
    // The native checkbox is visually hidden; users interact with its label.
    this.rememberMeCheckbox = page.locator("xpath=//input[@id='checkbox-remember']");
    this.rememberMeLabel = page.locator("xpath=//label[@for='checkbox-remember']");
    this.signInButton = page.locator("xpath=//button[@id='js-login-btn']");
    this.forgotPasswordButton = page.locator("xpath=//button[@onclick='login.gotoForgotPasswordView()']");
    this.forgotPasswordEmailInput = page.locator("xpath=//input[@id='forgot-password-username']");
    // The page is A/B tested: visitors get either the original wingify.com free-trial link or a
    // vwo.com variant (observed on 2026-11-02 across runs). Both stay in the DOM; only one is visible.
    this.freeTrialLink = page
      .locator("xpath=//a[contains(@href,'/free-trial/') and starts-with(@href,'https://')]")
      .filter({ visible: true });
    this.googleSignInButton = page.locator("xpath=//button[@id='js-google-signin-btn']");
    this.ssoSignInButton = page.locator("xpath=//button[@onclick='login.goToSSOView()']");
    this.passkeySignInButton = page.locator("xpath=//button[@onclick='login.loginUsingPasskey()']");
    this.ssoEmailInput = page.locator("xpath=//input[@id='sso-email']");
    // Each sub-view (Forgot Password, SSO, ...) has its own Back button; only the active view's is visible.
    this.backToLoginButton = page.locator("xpath=//button[@onclick='login.gotoLoginView()']").filter({ visible: true });
    this.notificationBox = page.locator("xpath=//div[@id='js-notification-box']");
    this.notificationMessage = page.locator("xpath=//div[@id='js-notification-box-msg']");
  }

  /** Runs a UI action and rethrows failures with page context, preserving the original error. */
  private async perform<T>(action: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`LoginPage: "${action}" failed on ${this.page.url()}\n${reason}`, { cause: error });
    }
  }

  async open(): Promise<void> {
    await this.perform('open login page', async () => {
      // The page embeds third-party media/analytics that can delay the "load" event indefinitely
      // (observed in Firefox), so readiness is judged by the login form being visible instead.
      const response = await this.page.goto(ROUTES.login, { waitUntil: 'domcontentloaded' });
      if (response && !response.ok()) {
        throw new Error(`Navigation returned HTTP ${response.status()}`);
      }
      await expect(this.emailInput).toBeVisible();
    });
  }

  /** Fails fast if an XPath matches zero or several elements. */
  async assertUnique(locator: Locator, name: string): Promise<void> {
    await this.perform(`verify "${name}" locator is unique`, async () => {
      await expect(locator, `${name} should match exactly one element`).toHaveCount(1);
    });
  }

  async enterEmail(email: string): Promise<void> {
    await this.perform('enter email', () => this.emailInput.fill(email));
  }

  async enterPassword(password: string): Promise<void> {
    await this.perform('enter password', () => this.passwordInput.fill(password));
  }

  async togglePasswordVisibility(): Promise<void> {
    await this.perform('toggle password visibility', () => this.passwordVisibilityToggle.click());
  }

  async setRememberMe(checked: boolean): Promise<void> {
    await this.perform(`set Remember Me to ${checked}`, async () => {
      if ((await this.rememberMeCheckbox.isChecked()) !== checked) {
        await this.rememberMeLabel.click();
      }
    });
  }

  async clickSignIn(): Promise<void> {
    await this.perform('click Sign in', () => this.signInButton.click());
  }

  /**
   * Fills the form, submits it and waits for the POST /login response.
   * Returns the HTTP status; throws a descriptive error when the server rate-limits (HTTP 429),
   * because the UI shows no feedback in that case and tests would otherwise just time out.
   */
  async login(email: string, password: string, rememberMe = false): Promise<number> {
    await this.enterEmail(email);
    await this.enterPassword(password);
    await this.setRememberMe(rememberMe);

    return this.perform('submit login', async () => {
      const authResponse = this.page.waitForResponse(
        (res) => res.request().method() === 'POST' && new URL(res.url()).pathname === '/login',
      );
      await this.signInButton.click();
      const response = await authResponse;
      if (response.status() === 429) {
        throw new Error(
          'Server rate-limited the login request (HTTP 429 Too Many Requests). ' +
            'Too many failed attempts from this IP; wait before re-running authentication tests.',
        );
      }
      return response.status();
    });
  }

  async openForgotPassword(): Promise<void> {
    await this.perform('open Forgot Password view', () => this.forgotPasswordButton.click());
  }

  async openSsoView(): Promise<void> {
    await this.perform('open SSO view', () => this.ssoSignInButton.click());
  }

  async backToLogin(): Promise<void> {
    await this.perform('return to login view', () => this.backToLoginButton.click());
  }

  async getValidationMessage(): Promise<string> {
    return this.perform('read authentication message', async () => {
      await expect(this.notificationMessage).toBeVisible();
      return (await this.notificationMessage.innerText()).trim();
    });
  }
}
