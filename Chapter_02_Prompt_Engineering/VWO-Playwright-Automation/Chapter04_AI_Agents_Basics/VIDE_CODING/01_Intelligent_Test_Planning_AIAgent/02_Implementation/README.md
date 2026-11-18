# Jira → Test Plan Generator

Enter a Jira issue ID → the backend fetches it from Jira (read-only) → an LLM (Groq or local Ollama) fills `01_Plan/TestPlan_Template.md` → the plan is shown.

## Run
```bash
npm install
npm start          # http://localhost:3000
```
Requires Node 20.12+ (uses built-in `process.loadEnvFile` and `fetch`).

## Config
Read on the server from `VWO-Playwright-Automation/.env`:
`JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_TOKEN`, `GROQ_API_KEY`.
The Settings page can override these at runtime (kept in server memory only; secrets are never sent back to the browser).

## Deploy (Vercel)
`api/index.js` exposes the Express app as a function. `vercel.json` serves `src/frontend` statically.
Set these env vars in Vercel: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_TOKEN`, `GROQ_API_KEY`, `APP_PASSWORD`.
If `APP_PASSWORD` is set, every `/api` call needs it (the page prompts for it). Then run `npx vercel deploy --prod`.
`src/backend/TestPlan_Template.md` is a copy of `01_Plan/TestPlan_Template.md` for the deployed build. Re-copy it after you edit the template.

## Structure
- `src/backend/server.js`: Express API (Jira read, LLM call, settings, connection tests) that also serves the frontend.
- `src/frontend/`: React from a CDN, no build step. Main page and Settings page as in `00_Design`.

## Limitations
- Settings changes reset when the server restarts.
- The LLM call uses temperature 0 and a fixed seed, but output can still vary slightly between runs.
- The plan is a DRAFT for human review, as the template states.
