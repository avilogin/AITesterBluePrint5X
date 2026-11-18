import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, start, wrap, parseKey, readIssue, readTemplate, llm, RULES } from './lib.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const app = createApp(dir);

// Column order = TestCase_Template.md = CSV order.
const COLS = ['id', 'title', 'module', 'requirementRef', 'type', 'priority', 'preconditions', 'testData', 'steps', 'expectedResult', 'automation'];

function parseCases(raw) {
  let data;
  try { data = JSON.parse(String(raw).replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch { throw { code: 502, msg: 'LLM did not return valid JSON. Try again.' }; }
  const list = Array.isArray(data) ? data : data.testCases;
  if (!Array.isArray(list) || !list.length) throw { code: 502, msg: 'LLM returned no test cases.' };
  return list.map((c, n) => Object.fromEntries(COLS.map(k => {
    let v = c?.[k];
    if (k === 'steps') v = (Array.isArray(v) ? v : String(v ?? '').split(/\n+/)).map(s => String(s).replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean);
    else v = v == null || v === '' ? (k === 'id' ? `TC-${n + 1}` : 'Insufficient information to determine.') : String(v);
    return [k, v];
  })));
}

app.post('/api/generate', wrap(async (req, res) => {
  const key = parseKey(req.body?.ticket);
  const notes = String(req.body?.notes || '').slice(0, 5000);
  const issue = await readIssue(key);
  const template = readTemplate(dir, 'TestCase_Template.md');
  const raw = await llm([
    { role: 'system', content: `You are a senior QA engineer. Write detailed, traceable test cases following the template below.
${RULES}
Cover positive, negative and boundary cases for every acceptance criterion. Quote exact messages from the source.
Return ONLY a JSON object: {"testCases": [ { ${COLS.map(c => `"${c}"`).join(', ')} } ]}
"steps" is an array of strings (one action each, no numbering). All other values are strings.

TEMPLATE:
${template}` },
    { role: 'user', content: `JIRA SOURCE (${issue.link}):\n${issue.text}${notes ? `\n\nUSER NOTES:\n${notes}` : ''}` },
  ], { json: true });
  res.json({ key: issue.key, summary: issue.summary, link: issue.link, children: issue.children, columns: COLS, testCases: parseCases(raw) });
}));

export default app;
start(app, 3002);
