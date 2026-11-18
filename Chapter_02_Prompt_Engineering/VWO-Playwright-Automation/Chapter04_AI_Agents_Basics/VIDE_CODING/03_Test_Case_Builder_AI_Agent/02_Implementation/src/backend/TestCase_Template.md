# Test Case Template

One row per test case. The app shows these as a table and exports them as CSV in this column order.

| Column | Key | Description | Example |
|--------|-----|-------------|---------|
| Test Case ID | `id` | `TC-<n>`, sequential | TC-1 |
| Title | `title` | Short, action-focused name | Login with valid credentials |
| Module | `module` | Feature area from the ticket | Login |
| Requirement Ref | `requirementRef` | Ticket key + AC number, or `Gap` / `Inference (low confidence)` | KAN-7 AC2 |
| Type | `type` | Positive / Negative / Boundary / UI / Security / Accessibility | Positive |
| Priority | `priority` | P0 (critical) – P3 (low) | P0 |
| Preconditions | `preconditions` | State needed before step 1 | User is on the login page |
| Test Data | `testData` | Exact values used | standard_user / secret_sauce |
| Steps | `steps` | Numbered, one action per step | 1. Enter username 2. Enter password 3. Click Login |
| Expected Result | `expectedResult` | Observable outcome, quoting exact messages from the ticket | Products page (/inventory.html) is shown |
| Automation Candidate | `automation` | Yes / No | Yes |

Rules:
- Every case maps to an acceptance criterion, or is marked `Gap` / `Inference (low confidence)`.
- Unknown values are written as: **Insufficient information to determine.**
- The output is a DRAFT for human review.
