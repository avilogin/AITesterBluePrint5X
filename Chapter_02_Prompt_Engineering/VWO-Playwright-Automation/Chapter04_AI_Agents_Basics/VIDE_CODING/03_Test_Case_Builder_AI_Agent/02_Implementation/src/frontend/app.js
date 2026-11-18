// Shared frontend for the Test Strategy and Test Case apps. Per-app labels come from window.APP (index.html).
const { useState, useEffect } = React;
const html = htm.bind(React.createElement);
const A = window.APP;

let appPassword = ''; // memory only; asked again after a reload
const api = async (url, body, retry = true) => {
  const headers = { 'Content-Type': 'application/json', 'x-app-password': appPassword };
  const r = await fetch(url, body === undefined ? { headers } : { method: 'POST', headers, body: JSON.stringify(body) });
  if (r.status === 401 && retry) {
    const pw = window.prompt('App password:');
    if (pw !== null) { appPassword = pw; return api(url, body, false); }
  }
  const d = await r.json().catch(() => ({ error: 'Bad server response.' }));
  if (!r.ok) throw new Error(d.error || `Error ${r.status}`);
  return d;
};

const LABELS = { id: 'ID', title: 'Title', module: 'Module', requirementRef: 'Requirement Ref', type: 'Type', priority: 'Priority',
  preconditions: 'Preconditions', testData: 'Test Data', steps: 'Steps', expectedResult: 'Expected Result', automation: 'Automation' };

function downloadCsv(d) {
  const cell = v => `"${String(Array.isArray(v) ? v.map((s, i) => `${i + 1}. ${s}`).join('\n') : v).replace(/"/g, '""')}"`;
  const rows = [d.columns.map(c => cell(LABELS[c] || c)), ...d.testCases.map(tc => d.columns.map(c => cell(tc[c])))];
  const blob = new Blob(['﻿' + rows.map(r => r.join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${d.key}_test_cases.csv` });
  a.click(); URL.revokeObjectURL(a.href);
}

function Result({ d }) {
  const src = html`<div class="src">Source: <a href=${d.link} target="_blank" rel="noopener">${d.key}</a> — ${d.summary}
    ${d.children?.length ? html` · includes ${d.children.length} child issue(s): ${d.children.join(', ')}` : ''}</div>`;
  if (A.kind === 'strategy') {
    return html`${src}<div class="md" dangerouslySetInnerHTML=${{ __html: DOMPurify.sanitize(marked.parse(d.result)) }} />`;
  }
  return html`${src}
    <div class="bar"><span>${d.testCases.length} test cases · DRAFT for human review</span>
      <button onClick=${() => downloadCsv(d)}>⬇ Download CSV</button></div>
    <div class="tablewrap"><table>
      <thead><tr>${d.columns.map(c => html`<th key=${c}>${LABELS[c] || c}</th>`)}</tr></thead>
      <tbody>${d.testCases.map(tc => html`<tr key=${tc.id}>${d.columns.map(c => html`<td key=${c}>
        ${c === 'steps' ? html`<ol>${tc.steps.map((s, i) => html`<li key=${i}>${s}</li>`)}</ol>` : tc[c]}</td>`)}</tr>`)}</tbody>
    </table></div>`;
}

function Main({ model }) {
  const [ticket, setTicket] = useState('');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [st, setSt] = useState({});
  const go = async e => {
    e.preventDefault();
    if (st.loading) return;
    if (!ticket.trim()) return setSt({ error: 'Enter a Jira ticket key or URL.' });
    setSt({ loading: true });
    try { setSt({ data: await api('/api/generate', { ticket, notes }) }); } catch (er) { setSt({ error: er.message }); }
  };
  return html`
    <section class="output">
      ${st.loading ? html`<div class="empty"><div class="spin"></div><p>Reading the Jira ticket and generating ${A.what}…</p></div>`
      : st.data ? html`<${Result} d=${st.data} />`
      : html`<div class="empty"><div class="icon">${A.icon}</div><h2>${A.heading}</h2>
          <p>Enter a ticket key such as <code>PROJ-123</code> or paste the ticket URL. An Epic includes its child stories.</p></div>`}
      ${st.error && html`<div class="err">${st.error}</div>`}
    </section>
    <form class="composer" onSubmit=${go}>
      <div class="chips"><span class="chip on">${A.tab}</span><span class="hint">${A.hint}</span></div>
      <div class="row">
        <input placeholder="JIRA ticket, e.g. PROJ-123 or https://your-org.atlassian.net/browse/PROJ-123" value=${ticket} onInput=${e => setTicket(e.target.value)} />
        <button disabled=${st.loading}>${st.loading ? 'Generating…' : A.button}</button>
      </div>
      ${showNotes && html`<textarea rows="3" placeholder="Optional notes, e.g. focus areas, browsers, constraints" value=${notes} onInput=${e => setNotes(e.target.value)} />`}
      <div class="foot"><a href="#" onClick=${e => { e.preventDefault(); setShowNotes(!showNotes); }}>${showNotes ? '− Hide notes' : '+ Add notes'}</a>
        <span>${model}</span></div>
    </form>`;
}

function Msg({ m }) {
  return m ? html`<span class=${m.ok ? 'ok' : m.busy ? 'muted' : 'errtxt'}> ${m.text}</span>` : null;
}

function Settings({ s, setS }) {
  const [msg, setMsg] = useState({});
  const f = k => ({ value: s[k] || '', onInput: e => setS({ ...s, [k]: e.target.value }) });
  const test = async which => {
    setMsg(m => ({ ...m, [which]: { busy: true, text: 'Testing…' } }));
    try {
      const r = await api(`/api/test/${which}`, {
        jira: { url: s.url, email: s.email, token: s.token },
        llm: { provider: s.provider, groqKey: s.groqKey, groqModel: s.groqModel, ollamaUrl: s.ollamaUrl, ollamaModel: s.ollamaModel },
      });
      setMsg(m => ({ ...m, [which]: { ok: true, text: r.msg } }));
    } catch (e) { setMsg(m => ({ ...m, [which]: { text: e.message } })); }
  };
  return html`<div class="settings">
    <div class="card"><h3>JIRA Connection</h3>
      <label>URL</label><input ...${f('url')} placeholder="https://your-org.atlassian.net" />
      <label>Email</label><input ...${f('email')} />
      <label>Token</label><input type="password" ...${f('token')} placeholder=${s.hasToken ? '•••••• (set — leave blank to keep)' : 'API token'} />
      <button type="button" onClick=${() => test('jira')}>Test Connection</button><${Msg} m=${msg.jira} />
    </div>
    <div class="card"><h3>LLM Configuration</h3>
      <label>Provider</label>
      <select value=${s.provider} onChange=${e => setS({ ...s, provider: e.target.value })}>
        <option value="ollama">1. Ollama (local)</option><option value="groq">2. Groq.com (API key)</option>
      </select>
      ${s.provider === 'ollama' ? html`
        <label>Ollama URL</label><input ...${f('ollamaUrl')} />
        <label>Model</label><input ...${f('ollamaModel')} />
        <button type="button" onClick=${() => test('llm')}>Test Local LLM</button>` : html`
        <label><a href="https://console.groq.com/keys" target="_blank" rel="noopener">Groq.com ↗</a> API key</label>
        <input type="password" ...${f('groqKey')} placeholder=${s.hasGroqKey ? '•••••• (set — leave blank to keep)' : 'gsk_...'} />
        <label>Model</label><input ...${f('groqModel')} />
        <button type="button" onClick=${() => test('llm')}>Test Groq.com</button>`}
      <${Msg} m=${msg.llm} />
    </div></div>`;
}

function App() {
  const [page, setPage] = useState('main');
  const [s, setS] = useState(null);
  useEffect(() => { api('/api/settings').then(d => setS({ ...d.jira, token: '', ...d.llm, groqKey: '' })).catch(() => setS({})); }, []);
  const model = !s?.provider ? '' : s.provider === 'groq' ? `Model: Groq / ${s.groqModel}` : `Model: Ollama / ${s.ollamaModel}`;
  const tab = (p, label) => html`<button class=${'tab' + (page === p ? ' on' : '')} onClick=${() => setPage(p)}>${label}</button>`;
  return html`
    <header><div class="brand"><span class="logo">✓</span>${A.name}</div><nav>${tab('main', A.tab)}${tab('settings', 'Settings')}</nav></header>
    <main>${page === 'main' ? html`<${Main} model=${model} />` : s ? html`<${Settings} s=${s} setS=${setS} />` : html`<p class="muted">Loading…</p>`}</main>`;
}

ReactDOM.createRoot(document.getElementById('root')).render(html`<${App} />`);
