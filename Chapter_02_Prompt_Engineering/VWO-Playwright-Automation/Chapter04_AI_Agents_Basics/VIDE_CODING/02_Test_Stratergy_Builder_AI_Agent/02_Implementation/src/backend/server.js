import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, start, wrap, parseKey, readIssue, readTemplate, llm, RULES } from './lib.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const app = createApp(dir);

app.post('/api/generate', wrap(async (req, res) => {
  const key = parseKey(req.body?.ticket);
  const notes = String(req.body?.notes || '').slice(0, 5000);
  const issue = await readIssue(key);
  const template = readTemplate(dir, 'TestStrategy_Template.md');
  const strategy = await llm([
    { role: 'system', content: `You are a senior QA lead. Write a test strategy in Markdown using EXACTLY the section names and order of the template below.
${RULES}
Label proposed approaches as proposals; do not present them as confirmed requirements. Output only the test strategy.

TEMPLATE:
${template}` },
    { role: 'user', content: `JIRA SOURCE (${issue.link}):\n${issue.text}${notes ? `\n\nUSER NOTES:\n${notes}` : ''}` },
  ]);
  res.json({ key: issue.key, summary: issue.summary, link: issue.link, children: issue.children, result: strategy });
}));

export default app;
start(app, 3001);
