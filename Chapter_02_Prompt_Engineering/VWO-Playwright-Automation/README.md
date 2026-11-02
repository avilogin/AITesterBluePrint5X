# VWO Login – Playwright + TypeScript

POM-based UI automation for https://app.wingify.com/#/login (Chromium, Firefox, WebKit) with Allure reporting.
Requirements source: *Product Requirements Document: VWO Login Dashboard*. Every test is linked to its PRD
section, which appears as the **Story** in the Allure report.

## Structure

```
pages/LoginPage.ts          Page Object: XPath locators, actions, error context
fixtures/test-fixtures.ts   loginPage fixture, failure diagnostics, mockLoginResponse()
utils/test-data.ts          env config, verified messages/URLs/server responses, test data
utils/prd.ts                traceToPrd(): links a test to a PRD section in Allure
tests/login-valid.spec.ts   positive / UI / accessibility / security scenarios
tests/login-invalid.spec.ts negative / authentication-failure scenarios
```

## Setup

```powershell
npm install
npx playwright install          # Chromium, Firefox, WebKit
copy .env.example .env          # optional: add VWO_EMAIL / VWO_PASSWORD
```

Without credentials, three tests are skipped: successful login, Remember Me session, and
"invalid password for a registered email". No credentials are stored in the project.

## Run

| Purpose | Command |
|---|---|
| All tests | `npm test` |
| Positive tests | `npm run test:valid` |
| Negative tests | `npm run test:invalid` |
| Chromium only | `npm run test:chromium` |
| Headed | `npm run test:headed` |
| Debug (Inspector) | `npm run test:debug` |
| Type check | `npm run typecheck` |
| Playwright HTML report | `npm run report` |

Allure results are written to `allure-results/` on every run (the report CLI needs Java).

| Purpose | Command |
|---|---|
| Generate HTML report | `npm run allure:generate` |
| Open generated report | `npm run allure:open` |
| Generate + open in one step | `npm run allure:serve` |

Opt-in suites (PowerShell):

```powershell
$env:CROSS_BROWSER_AUTH='true'; npm test; Remove-Item Env:CROSS_BROWSER_AUTH   # real logins on all browsers
$env:RUN_PERF='true'; npm test; Remove-Item Env:RUN_PERF                       # PRD 2-second load budget
```

## Rate limiting (important)

The server throttles failed logins per IP: after roughly **5 failures** in a short window it returns
HTTP 429 `Too many requests` (and then asks for a captcha). Because of that:

- Only tests tagged `@auth-attempt` send real failed logins (5 per run, 6 with credentials configured),
  on Chromium only by default, with retries disabled.
- Tests about the UI's reaction to a failure replay the **real 401 response captured from the server**
  (`SERVER_RESPONSES` in `utils/test-data.ts`), so they run on all browsers without extra attempts.
- If a run reports `Server rate-limited the login request (HTTP 429)`, wait a few minutes and re-run.

## PRD traceability

| PRD section | Requirement | Test(s) | Status |
|---|---|---|---|
| Existing Features | Email/password fields | displays all elements; email field; password field | Automated |
| Existing Features | Remember Me | toggle Remember Me via label; keep session (needs creds) | Automated / needs creds |
| Existing Features | Free-trial registration link | open free trial in new tab | Automated |
| Existing Features / Theme Support | Light & Dark mode | light/dark mode option | `fixme` – not present |
| Login Process | Email + password login | log in with valid credentials | Needs creds |
| Login Process | SSO | open the SSO sign-in view | Automated (entry point only) |
| Login Process | Session timeout, MFA | – | Not testable without an account |
| User Input Validation | Validation on blur | validate fields on blur | `fixme` – not present |
| User Input Validation | Email format | email field type; invalid email format | Automated |
| User Input Validation | Clear error messages | 6 server-validated rejection cases; warning notification | Automated |
| User Input Validation | Password strength indicator | – | Not on login page (reset flow needs a token) |
| Password Management | Forgot Password flow | Forgot Password view and back | Automated (no reset e-mail sent) |
| Interface Design | Responsive design | mobile + tablet viewport | Automated |
| Interface Design | Auto-focus | auto-focus email field | Automated |
| Interface Design | Clickable labels | Remember Me label | Automated (email/password labels hidden in current UI) |
| Interface Design | Loading states | loading state during authentication | Automated |
| Accessibility | Screen reader support | accessible names | Automated |
| Accessibility | Keyboard navigation | submit the form from the keyboard | Automated |
| Security | HTTPS enforcement | redirect HTTP to HTTPS | Automated |
| Security | Password protection | password masked; masked after failed login | Automated |
| Security | Unauthorized access | no dashboard access after failed login | Automated |
| Compliance | Rate limiting | user informed on rate limit | `test.fail` – known defect |
| Performance | Load within 2 s | load budget (`@performance`) | Opt-in |
| Integration | Customer support | – | Not verifiable (see findings) |
| Third-Party | Social login (Google, Microsoft) | Google button visible | Partial – no Microsoft option |

Not verifiable through UI automation: encryption, password hashing, GDPR/CCPA, uptime, scalability,
WCAG 2.1 AA conformance (an axe-core scan would be a useful next step), high-contrast mode.

## Verified findings vs. PRD (2026-11-02)

1. **No feedback on rate limiting.** On HTTP 429 the UI shows no message and clears the password (PRD: clear, actionable error messages).
2. **No on-blur validation.** Leaving a field with invalid input shows nothing (PRD: real-time validation).
3. **Malformed emails are sent to the server.** The browser marks them invalid, but the form still submits.
4. **Forgot Password sends a reset request for an empty email** (`POST /forgotPassword/sendcode`) without client-side checks.
5. **No Light/Dark mode option or announcement** on the login page.
6. **Generic error for every failure.** Empty fields, bad format and wrong credentials all show "Your email, password, IP address or location did not match".
7. **Support e-mail link is never visible.** `mailto:support@wingify.com` is in the DOM but not rendered visibly, even after a failed login.
8. **No Microsoft social login.** Only Google, SSO and Passkey are offered.
9. **The page is A/B tested.** Different runs got different free-trial links (vwo.com vs. wingify.com), so the locator covers both variants.
10. **PRD names `app.vwo.com`; the tests target `app.wingify.com`** (both are live).
