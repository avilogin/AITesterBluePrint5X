const { useState, useEffect } = React;
const html = htm.bind(React.createElement);
let appPassword = ''; // kept in memory only; asked again after a page reload
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

function Main() {
  const [id, setId] = useState('');
  const [st, setSt] = useState({});
  const go = async e => {
    e.preventDefault();
    if (st.loading) return;
    if (!id.trim()) return setSt({ error: 'Enter a Jira issue ID.' });
    setSt({ loading: true });
    try { setSt({ data: await api('/api/plan', { issueId: id }) }); } catch (er) { setSt({ error: er.message }); }
  };
  const d = st.data;
  return html`
    <div class="box reply">
      ${st.loading ? html`<p class="muted">Fetching Jira issue and generating test plan…</p>`
      : st.error ? html`<p class="err">${st.error}</p>`
      : d ? html`<p class="muted">Source: <a href=${d.link} target="_blank">${d.key}</a> — ${d.summary}</p>
                 <div dangerouslySetInnerHTML=${{ __html: DOMPurify.sanitize(marked.parse(d.plan)) }} />`
      : html`<p class="muted">Reply with Test Plan will appear here.</p>`}
    </div>
    <form class="box row" onSubmit=${go}>
      <input placeholder="Prompt (JIRA Ticket) e.g. QA-123" value=${id} onInput=${e => setId(e.target.value)} />
      <button disabled=${st.loading}>${st.loading ? 'Generating…' : 'Generate'}</button>
    </form>`;
}

function Msg({ m }) {
  if (!m) return null;
  return html`<span class=${m.ok ? 'ok' : m.busy ? 'muted' : 'err'}> ${m.text}</span>`;
}

function Settings() {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState({});
  useEffect(() => {
    api('/api/settings')
      .then(d => setS({ ...d.jira, token: '', ...d.llm, groqKey: '' }))
      .catch(e => setMsg({ jira: { text: e.message } }));
  }, []);
  if (!s) return html`<p class="muted">Loading…</p>`;
  const f = k => ({ value: s[k], onInput: e => setS({ ...s, [k]: e.target.value }) });
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
  return html`
    <div class="box"><h3>JIRA Connection</h3>
      URL<input ...${f('url')} placeholder="https://your-site.atlassian.net" />
      Email<input ...${f('email')} />
      Token<input type="password" ...${f('token')} placeholder=${s.hasToken ? '•••••• (set — leave blank to keep)' : 'API token'} />
      <button onClick=${() => test('jira')}>Test Connection</button><${Msg} m=${msg.jira} />
    </div>
    <div class="box"><h3>LLM Configuration</h3>
      Provider
      <select value=${s.provider} onChange=${e => setS({ ...s, provider: e.target.value })}>
        <option value="ollama">1. Ollama (local)</option>
        <option value="groq">2. Groq.com (API key)</option>
      </select>
      ${s.provider === 'ollama' ? html`
        Ollama URL<input ...${f('ollamaUrl')} />
        Model<input ...${f('ollamaModel')} />
        <button onClick=${() => test('llm')}>Test Local LLM</button>` : html`
        <a href="https://console.groq.com/keys" target="_blank">Groq.com ↗</a> API key
        <input type="password" ...${f('groqKey')} placeholder=${s.hasGroqKey ? '•••••• (set — leave blank to keep)' : 'gsk_...'} />
        Model<input ...${f('groqModel')} />
        <button onClick=${() => test('llm')}>Test Groq.com</button>`}
      <${Msg} m=${msg.llm} />
    </div>`;
}

function App() {
  const [page, setPage] = useState('main');
  const tab = (p, label) => html`<button class=${'tab ' + (page === p ? 'on' : '')} onClick=${() => setPage(p)}>${label}</button>`;
  return html`
    <nav><b>Jira → Test Plan</b>${tab('main', 'Main')}${tab('settings', 'Settings')}</nav>
    <main>${page === 'main' ? html`<${Main} />` : html`<${Settings} />`}</main>`;
}

ReactDOM.createRoot(document.getElementById('root')).render(html`<${App} />`);
