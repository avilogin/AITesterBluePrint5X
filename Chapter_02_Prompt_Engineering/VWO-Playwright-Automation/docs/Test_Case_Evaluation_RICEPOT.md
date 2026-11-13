# VWO Login Test Cases: RICEPOT With vs Without Anti-Hallucination Rules

**Application:** app.vwo.com / app.wingify.com, login page (`/#/login`)
**Requirements source:** *Product Requirements Document: VWO Login Dashboard* (the PRD)
**Live-page facts:** verified by this framework's Playwright runs on 2026-11-02 (see `README.md` › Verified findings and `utils/test-data.ts`)

The exercise has five steps:

1. Generate test cases with a RICEPOT prompt and no anti-hallucination rules (**V1**).
2. Add anti-hallucination rules and generate again (**V2**).
3. List every information gap the rules exposed.
4. Fill the gaps from the live page, generate the final set (**V3**) and compare the three versions.
5. Judge whether the rules produced better, more accurate test cases.

---

## Step 1 · RICEPOT prompt (no anti-hallucination rules)

| Part | Content |
|:--|:--|
| **R**ole | You are a senior QA engineer with 10 years of experience testing SaaS web applications. |
| **I**nstructions | Write functional, negative, UI, security, accessibility and performance test cases for the VWO login page. |
| **C**ontext | VWO is an A/B testing and experimentation platform. Users log in at app.vwo.com with email and password, SSO or social login. The PRD is attached. |
| **E**xample | `TC01 · Valid login · Steps: enter a valid email and password, click Sign in · Expected: the user lands on the dashboard.` |
| **P**arameters | Cover positive and negative paths. One behaviour per test case. Include priority. |
| **O**utput | A Markdown table: ID, Title, Steps, Expected Result, Priority. |
| **T**one | Precise and professional, ready to hand to a tester. |

### V1 output: 22 test cases

| ID | Title | Steps (short) | Expected Result | Pri |
|:--|:--|:--|:--|:-:|
| TC01 | Valid login | Valid email + password → Sign in | Redirected to the dashboard, with a "Welcome, &lt;name&gt;" message | High |
| TC02 | Remember me | Tick Remember me, log in, reopen the browser | User stays logged in for 30 days | Med |
| TC03 | Wrong password | Registered email + wrong password | "Incorrect password. Please try again." | High |
| TC04 | Unregistered email | Unknown email + any password | "No account found with this email." | High |
| TC05 | Empty fields | Leave both fields empty → Sign in | "Email is required" and "Password is required" shown under the fields | High |
| TC06 | Malformed email | `abc@` + password → Sign in | "Please enter a valid email address"; the form is not submitted | Med |
| TC07 | Password masking | Type a password, click the eye icon twice | Masked by default; revealed, then masked again | Med |
| TC08 | Forgot password view | Click Forgot Password? | Reset view opens with an email field | Med |
| TC09 | Reset request | Submit a registered email in the reset view | "Reset link sent to your email"; the link is valid for 24 hours | Med |
| TC10 | Account lockout | 5 failed logins in a row | Account locked for 30 minutes, with a lockout message | High |
| TC11 | Session timeout | Log in, stay idle | Logged out after 30 minutes idle | Med |
| TC12 | SSO login | Click Sign in using SSO, enter a work email | Redirected to the company identity provider, then to the dashboard | Med |
| TC13 | Google login | Click Sign in with Google | Google popup; after consent, the user lands on the dashboard | Med |
| TC14 | Microsoft login | Click Sign in with Microsoft | Microsoft popup; after consent, the user lands on the dashboard | Med |
| TC15 | Keyboard use | Tab through the form, press Enter | Logical tab order; Enter submits the form | Med |
| TC16 | Auto-focus | Open the login page | The email field has focus | Low |
| TC17 | Responsive layout | Open at 375 px width | All controls visible, no horizontal scroll | Med |
| TC18 | HTTPS | Open `http://` URL | Redirected to `https://` | High |
| TC19 | Load time | Open the page on a standard connection | Loads within 2 seconds | Med |
| TC20 | Free trial link | Click Start a FREE TRIAL | Signup page opens | Low |
| TC21 | Dark mode | Toggle the theme switch | The page switches to dark mode | Low |
| TC22 | Logout | Log in, log out, press Back | Session ended; Back doesn't return to the dashboard | High |

V1 reads as complete, but 9 expected results contain a specific value nobody supplied: the welcome text, 30 days, the four error messages, 24 hours, the 5 attempts / 30 minute lockout and the 30 minute timeout. Nothing marks which values are real.

---

## Step 2 · Anti-hallucination rules added

These rules were appended to the same RICEPOT prompt:

1. Use only the PRD and the context given. Do not invent features, messages, limits or values.
2. When a required detail is missing, write **"Insufficient information to determine"** in its place.
3. If an expected result is a reasonable guess rather than a stated fact, label it **"Inference"**.
4. Give each test case a source: the PRD section it comes from.
5. Drop any test case that has no source.
6. Cover every PRD requirement that can be tested from the UI.

### V2 output: 26 test cases

Under rule 5, TC22 Logout was dropped because the PRD never mentions logout. Rule 6 added TC23 to TC27 for PRD requirements V1 had missed.

| ID | Title | Expected Result | Label | PRD source |
|:--|:--|:--|:--|:--|
| TC01 | Valid login | User is authenticated and leaves the login page; landing page is the dashboard | Inference | Login Process |
| TC02 | Remember me | Session persists after the browser is reopened. Duration: Insufficient information to determine | Insufficient | Existing Features › Remember Me |
| TC03 | Wrong password | An error message is shown. Text: Insufficient information to determine | Insufficient | Error Handling |
| TC04 | Unregistered email | An error is shown that doesn't reveal whether the account exists. Text: Insufficient information to determine | Insufficient | Error Handling / Security |
| TC05 | Empty fields | Login is blocked. Message and placement: Insufficient information to determine | Insufficient | User Input Validation |
| TC06 | Malformed email | Email format is rejected. Message: Insufficient information to determine | Insufficient | Email Format Verification |
| TC07 | Password masking | Masked by default; toggle reveals and re-masks | Sourced | Standard Authentication Fields |
| TC08 | Forgot password view | Reset view opens | Sourced | Forgot Password Flow |
| TC09 | Reset request | A confirmation is shown. Text and link expiry: Insufficient information to determine | Insufficient | Forgot Password Flow |
| TC10 | Repeated failed logins | Attempts are rate-limited. Threshold and user feedback: Insufficient information to determine | Insufficient | Compliance › Rate Limiting |
| TC11 | Session timeout | Idle session ends. Timeout value: Insufficient information to determine | Insufficient | Login Process › Session Timeout |
| TC12 | SSO login | SSO view opens; user is sent to the identity provider | Inference | Login Process › SSO |
| TC13 | Google login | Google consent flow starts and returns the user authenticated | Inference | Third-Party › Social Login |
| TC14 | Microsoft login | Microsoft option is shown and starts its consent flow | Sourced | Third-Party › Social Login |
| TC15 | Keyboard use | All controls reachable by Tab; Enter submits the form | Inference (Enter) | Accessibility › Keyboard Navigation |
| TC16 | Auto-focus | Email field has focus on load | Sourced | Interface Design › Auto-focus |
| TC17 | Responsive layout | Controls visible and usable on mobile and tablet widths | Sourced | Interface Design › Responsive Design |
| TC18 | HTTPS | HTTP requests are redirected to HTTPS | Sourced | Security › HTTPS Enforcement |
| TC19 | Load time | Page loads within 2 seconds on a standard connection | Sourced | Performance › Page Load Speed |
| TC20 | Free trial link | Registration page opens | Sourced | Existing Features › Registration Link |
| TC21 | Light/Dark mode | A theme option exists and switches the theme | Sourced | Branding › Theme Support |
| TC23 | Validation on blur | Leaving a field with invalid input shows feedback straight away | Sourced | User Input Validation › Real-time |
| TC24 | Screen reader names | Every control has an accessible name | Sourced | Accessibility › Screen Reader |
| TC25 | MFA login | Second factor is requested after the password. Flow: Insufficient information to determine | Insufficient | Login Process › MFA |
| TC26 | Password strength | Strength indicator shown when setting a password. Rules: Insufficient information to determine | Insufficient | User Input Validation › Password Strength |
| TC27 | Loading state | Sign in shows a loading state while the request is pending | Sourced | Interface Design › Loading States |

---

## Step 3 · Information gaps detected

The rules flagged **14 gaps**: 10 marked "Insufficient information to determine" and 4 marked "Inference". One more test case (TC22 Logout) was dropped for having no source.

| # | Case | Type | Missing detail |
|:-:|:--|:--|:--|
| G1 | TC01 | Inference | Where the user lands after login |
| G2 | TC02 | Insufficient | How long Remember me keeps the session |
| G3 | TC03 | Insufficient | Error text for a registered email with a wrong password |
| G4 | TC04 | Insufficient | Error text for an unregistered email |
| G5 | TC05 | Insufficient | Message and placement for empty fields |
| G6 | TC06 | Insufficient | Message for a malformed email, and whether the form submits |
| G7 | TC09 | Insufficient | Reset confirmation text and link expiry |
| G8 | TC10 | Insufficient | Failed-attempt threshold and what the user sees |
| G9 | TC11 | Insufficient | Idle timeout value |
| G10 | TC12 | Inference | What happens after an email is entered on the SSO view |
| G11 | TC13 | Inference | Google sign-in flow end to end |
| G12 | TC15 | Inference | Whether Enter submits the form |
| G13 | TC25 | Insufficient | MFA method and screens |
| G14 | TC26 | Insufficient | Password rules and the strength indicator |
| – | TC22 | Dropped | Logout isn't in the PRD |

---

## Step 4 · Gaps filled, final test cases, comparison

### Filling the gaps

Each gap was checked against the live page using the 2026-11-02 Playwright runs. Gaps that need a real account, an SSO tenant or a reset email stay open; nothing was guessed to close them.

| # | Status | What the live page shows |
|:-:|:--|:--|
| G1 | 🟡 Partial | The app header links to `#/dashboard`, but landing there can't be confirmed without credentials |
| G2 | ❌ Open | Needs a valid account and a multi-day check |
| G3 | ❌ Open | Needs a valid account; the test exists but is skipped without credentials |
| G4 | ✅ Filled | `Your email, password, IP address or location did not match`. Generic, so it doesn't reveal whether the account exists |
| G5 | ✅ Filled | The same generic message after a server round-trip. No messages under the fields |
| G6 | ✅ Filled | The browser marks the field invalid, **but the form still submits** and shows the generic message |
| G7 | 🟡 Partial | The reset request is sent (`POST /forgotPassword/sendcode`), even with an empty email. Confirmation text and expiry not captured |
| G8 | ✅ Filled | After about 5 failures per IP the server returns HTTP 429 and later asks for a captcha. **The UI shows no message** and clears the password |
| G9 | ❌ Open | Needs a valid account and a long idle wait |
| G10 | 🟡 Partial | The SSO view opens with an email field and a Back button. The redirect needs an SSO-enabled account |
| G11 | 🟡 Partial | The Google button is visible. The flow needs a Google account |
| G12 | ✅ Filled | Yes. Tab moves from email to password and Enter on Sign in submits |
| G13 | ❌ Open | Needs an account with MFA turned on |
| G14 | ❌ Open | No indicator on the login page. The reset form needs a real reset token |

**Result:** 5 filled, 4 partly filled, 5 still open.

While checking the gaps, the live page also showed things the PRD doesn't mention: a **Passkey** sign-in option, a hidden support link, and a free-trial link that changes between visits because the page is A/B tested.

### V3 output: 30 test cases (rules plus gaps filled)

The rules were amended for V3:
- Check the live page before writing "Insufficient information".
- Keep features seen on the page and label them **Observed, not in PRD**.
- Label differences between the PRD and the page **PRD/Live mismatch**.

That brought back TC22 and added TC28 to TC30.

| ID | Title | Expected Result | Status |
|:--|:--|:--|:--|
| TC01 | Valid login | User leaves the login page authenticated; dashboard expected | 🟡 Inference (needs creds) |
| TC02 | Remember me | Session persists after reopening the browser. Duration: open question | ❌ Open |
| TC03 | Wrong password | Error shown. Text: open question (likely the generic message) | ❌ Open |
| TC04 | Unregistered email | `Your email, password, IP address or location did not match` | ✅ Verified |
| TC05 | Empty fields | Same generic message; no field-level messages | ✅ Verified |
| TC06 | Malformed email | PRD: format rejected before submit. Live: submitted, generic message | ⚠️ PRD/Live mismatch |
| TC07 | Password masking | Masked by default; eye toggle reveals and re-masks | ✅ Verified |
| TC08 | Forgot password view | Reset view opens; Back returns to login | ✅ Verified |
| TC09 | Reset request | Request is sent. Confirmation text and link expiry: open question | 🟡 Partial |
| TC10 | Repeated failed logins | PRD: clear feedback. Live: HTTP 429 after about 5 tries, no message shown | ⚠️ PRD/Live mismatch (defect) |
| TC11 | Session timeout | Idle session ends. Value: open question | ❌ Open |
| TC12 | SSO login | SSO view opens with an email field; IdP redirect needs an SSO account | 🟡 Partial |
| TC13 | Google login | Google button visible; full flow needs a Google account | 🟡 Partial |
| TC14 | Microsoft login | PRD requires it; the live page has no Microsoft option | ⚠️ PRD/Live mismatch |
| TC15 | Keyboard use | Tab order email → password; Enter submits | ✅ Verified |
| TC16 | Auto-focus | Email field focused on load | ✅ Verified |
| TC17 | Responsive layout | Controls visible inside 375×667 and 768×1024 viewports | ✅ Verified |
| TC18 | HTTPS | HTTP permanently redirected to HTTPS | ✅ Verified |
| TC19 | Load time | DOMContentLoaded within 2 s | ✅ Measurable (opt-in test) |
| TC20 | Free trial link | Signup opens in a new tab; the link target varies between visits (A/B test) | ✅ Verified |
| TC21 | Light/Dark mode | PRD requires it; no theme option on the page | ⚠️ PRD/Live mismatch |
| TC22 | Logout | Session ends; Back and the dashboard URL return to login | 🟡 Inference (standard security, needs creds) |
| TC23 | Validation on blur | PRD requires it; nothing appears on blur | ⚠️ PRD/Live mismatch |
| TC24 | Screen reader names | All controls have accessible names | ✅ Verified |
| TC25 | MFA login | Second factor requested. Flow: open question | ❌ Open |
| TC26 | Password strength | Indicator on the reset form. Rules: open question | ❌ Open |
| TC27 | Loading state | Sign in shows a busy state while `POST /login` is pending | ✅ Verified |
| TC28 | Passkey sign-in | Sign in with Passkey starts the browser passkey prompt | 🆕 Observed, not in PRD |
| TC29 | Support contact | A support contact is visible after a failed login (PRD Integration). Live: `mailto:` link exists but is hidden | ⚠️ PRD/Live mismatch |
| TC30 | Empty reset email | Reset is blocked when the email is empty. Live: request is sent anyway | ⚠️ Observed defect |

### Comparison

| Measure | V1 No rules | V2 With rules | V3 Rules + gaps filled |
|:--|:-:|:-:|:-:|
| Test cases | 22 | 26 | **30** |
| Specific values with no source | 9 | 0 | 0 |
| Expected results the live page proves wrong | 4 (TC04, TC05, TC06, TC10) | 0 | 0 |
| Gaps visible in the document | 0 (hidden) | 14 | 9 (4 partial, 5 open) |
| Expected result fully known, ready to run | 22* | 12 | **20** |
| Verified against the live page | 0 | 0 | **14** |
| PRD/Live mismatches or defects surfaced | 0 | 0 | **7** |

\* V1 looks fully ready, but 9 of its expected results are invented. A run would report false failures on TC04, TC05, TC06 and TC10, and TC03 is unknown.

Side by side on the cases that changed the most:

| Case | V1 | V2 | V3 |
|:--|:--|:--|:--|
| TC05 Empty fields | Two field-level "required" messages | Text: Insufficient | One generic server message, verified |
| TC06 Malformed email | Form not submitted | Message: Insufficient | Submitted anyway: mismatch |
| TC10 Failed logins | Locked 30 min after 5 tries | Threshold: Insufficient | HTTP 429 after about 5 tries, no UI message: defect |
| TC14 Microsoft | Popup opens | Option shown (PRD) | Option missing: mismatch |
| TC22 Logout | Included, no source | Dropped | Restored as labelled inference |

---

## Step 5 · Evaluation: did the rules give better test cases?

**Verdict: yes on accuracy, partly on usefulness.** The rules removed every invented value and every expected result that turned out wrong. On their own they made the suite less runnable, and the real gain came from checking the gaps against the live page.

**Where the rules helped**
- **No false expectations.** V1 had 4 expected results the live page contradicts, and running it would have produced 4 bogus failures. V2 and V3 have none.
- **Hidden assumptions became visible.** 14 gaps that V1 had silently filled with plausible values are now listed. A reviewer can see what to confirm.
- **Better PRD coverage.** Rule 6 added 5 PRD requirements V1 missed: blur validation, screen-reader names, MFA, password strength and loading state. Two of them later exposed mismatches.
- **Safer security expectations.** V1's TC04 expected "No account found", a message that would reveal which emails are registered. V2 asked for a non-revealing message instead, which is what the live page does.

**Where the rules hurt**
- **Fewer runnable cases.** V2 dropped from 22 to 12 cases with a fully known expected result.
- **"Insufficient" where the answer was easy to find.** At least 4 V2 gaps (G4, G5, G6, G12) were answered by one visit to the page. The rules never told the model to look.
- **A real test was lost.** TC22 Logout was dropped for lacking a PRD source, though every logged-in app needs a session-ending check.
- **PRD trust.** "Sourced" cases TC14, TC21 and TC23 describe features the live page doesn't have. The rules check against the PRD only, not the product.

**Prompt changes I'd keep for next time**
1. Check the live application before writing "Insufficient information". Reserve it for values that can't be observed, such as timeouts, policies and limits.
2. Keep features seen on the page and label them *Observed, not in PRD*, instead of dropping them.
3. Flag expected results where the PRD and the page disagree as *PRD/Live mismatch*.
4. Allow standard security checks (logout, session end) as labelled *Inference* rather than dropping them.

**Limits of this comparison:** all three versions were written by the same author, and V1 deliberately shows typical unconstrained LLM output. The live-page facts come from the 2026-11-02 automation runs, not a fresh check. Open gaps G2, G3, G9, G13 and G14 need a test account before the suite is complete.
