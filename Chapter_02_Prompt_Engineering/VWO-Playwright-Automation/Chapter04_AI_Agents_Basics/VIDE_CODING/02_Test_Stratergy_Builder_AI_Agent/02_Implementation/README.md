# Test Strategy Builder

Enter a Jira ticket key or URL (plus optional notes). The backend reads the ticket from Jira (read-only) and an LLM (Groq or local Ollama) fills `01_Plan/TestStrategy_Template.md`. The strategy is shown as formatted Markdown.
If the ticket is an **Epic**, its child issues are read and included automatically.

## Run
```bash
npm install
npm start          # http://localhost:3001
```
Requires Node 20.12+.

## Config
Read on the server from `VWO-Playwright-Automation/.env`: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_TOKEN`, `GROQ_API_KEY`.
Optional `APP_PASSWORD`: when set, every `/api` call needs it (the page asks for it).

## Structure
- `src/backend/lib.js`: shared code (Jira, Epic children, LLM, settings, password). The Test Case Builder has an identical copy.
- `src/backend/server.js`: `POST /api/generate`, which builds the strategy.
- `src/backend/TestStrategy_Template.md`: copy of `01_Plan/TestStrategy_Template.md` for the deployed build. Locally, the `01_Plan` file is used.
- `src/frontend/`: React from a CDN, no build step. Design from `00_Design/UI_Design.png`.
- `api/index.js` + `vercel.json`: Vercel deployment (not deployed yet).

## Deploy (later)
Set the env vars above in Vercel, then run `npx vercel deploy --prod`.

## Limitations
- Settings typed on the Settings page last until the server restarts. On Vercel they apply only to the Test buttons.
- The LLM call uses temperature 0 and a fixed seed, but output can still vary slightly between runs.
- Epic support is implemented and the child-issue query was checked against Jira, but it has not been run on a real Epic yet.
