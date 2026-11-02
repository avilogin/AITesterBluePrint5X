import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

/**
 * Central test data. Credentials are read from environment variables only (see .env.example).
 * Nothing in this file is a real account.
 */
export const ENV = {
  baseURL: process.env.BASE_URL ?? 'https://app.wingify.com',
  validEmail: process.env.VWO_EMAIL ?? '',
  validPassword: process.env.VWO_PASSWORD ?? '',
};

export const hasValidCredentials = (): boolean => ENV.validEmail !== '' && ENV.validPassword !== '';

export const ROUTES = {
  login: '/#/login',
  dashboard: '/#/dashboard',
};

// URL patterns observed in the live application (verified 2026-11-02).
export const URL_PATTERNS = {
  login: /#\/login/,
  forgotPassword: /#\/forgot-password/,
  sso: /#\/sso/,
  // The app header contains <a ui-sref="dashboard" href="#/dashboard">; successful-login landing
  // on this route could not be verified without credentials -> Inference (low confidence).
  dashboard: /#\/dashboard/,
  freeTrial: /free-trial/,
};

// Messages observed in the live application (verified 2026-11-02 in Chromium).
export const MESSAGES = {
  authFailure: 'Your email, password, IP address or location did not match',
};

// Exact POST /login response bodies captured from the live server (2026-11-02). Used to test the
// UI's reaction to failures without sending more real failed logins (the server throttles at ~7/IP).
export const SERVER_RESPONSES = {
  invalidUser: {
    status: 401,
    body: '{"message":"Invalid User","showCaptcha":true,"captchaKey":"6Lea9EQsAAAAAAwvM6qkbJn0fjA3AVNh6KfVF3Cn"}',
  },
  rateLimited: {
    status: 429,
    body: '{"errors":[{"code":429,"message":"Too many requests"}]}',
  },
};

// Deliberately non-existent accounts; these never authenticate.
export const INVALID_DATA = {
  unregisteredEmail: 'qa.automation.unregistered@example.com',
  wrongPassword: 'Wrong#Password123',
  malformedEmail: 'invalid-email-format',
  samplePassword: 'Sample#Password123',
  empty: '',
};

// PRD › Performance Requirements: "Login page loading within 2 seconds on standard connections".
export const PERFORMANCE = {
  pageLoadBudgetMs: Number(process.env.PAGE_LOAD_BUDGET_MS ?? 2000),
};

export const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
};
