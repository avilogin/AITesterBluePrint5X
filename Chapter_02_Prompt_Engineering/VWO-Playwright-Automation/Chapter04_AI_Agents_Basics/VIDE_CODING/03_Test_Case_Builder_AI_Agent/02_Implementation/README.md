# Test Case Builder

Enter a Jira ticket key or URL (plus optional notes). The backend reads the ticket from Jira (read-only) and an LLM (Groq or local Ollama) writes test cases following `01_Plan/TestCase_Template.md`. They are shown as a table and can be downloaded as CSV.
If the ticket is an **Epic**, its child issues are read and included automatically.

## Run
```bash
npm install
npm start          # http://localhost:3002
```
Requires Node 20.12+.

## Config
Read on the server from `VWO-Playwright-Automation/.env`: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_TOKEN`, `GROQ_API_KEY`.
Optional `APP_PASSWORD`: when set, every `/api` call needs it (the page asks for it).

## Output columns (table and CSV, same order)
ID, Title, Module, Requirement Ref, Type, Priority, Preconditions, Test Data, Steps, Expected Result, Automation.
The CSV is UTF-8 with a BOM, so Excel opens it correctly. Steps are numbered inside a single cell.

## Structure
- `src/backend/lib.js`: shared code (Jira, Epic children, LLM, settings, password). The Test Strategy Builder has an identical copy.
- `src/backend/server.js`: `POST /api/generate`. The LLM returns JSON, and the server checks it and fills in missing fields.
- `src/backend/TestCase_Template.md`: copy of `01_Plan/TestCase_Template.md` for the deployed build.
- `src/frontend/`: React from a CDN, no build step. Design from `00_Design/UI_Design.png`.
- `api/index.js` + `vercel.json`: Vercel deployment (not deployed yet).

## Deploy (later)
Set the env vars above in Vercel, then run `npx vercel deploy --prod`.

## Limitations
- The number of test cases can vary between runs (for example 10 or 12 for KAN-7), even with temperature 0.
- Settings typed on the Settings page last until the server restarts. On Vercel they apply only to the Test buttons.
- Epic support is implemented and the child-issue query was checked against Jira, but it has not been run on a real Epic yet.
