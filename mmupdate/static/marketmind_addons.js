(function () {
  const $ = (id) => document.getElementById(id);
  function initTheme() {
    const saved = localStorage.getItem('marketmind-theme') || 'dark';
    document.documentElement.dataset.theme = saved;
    const btn = $('themeToggle');
    if (btn) {
      const paint = () => { const light = document.documentElement.dataset.theme === 'light'; btn.textContent = light ? '🌙 Dark mode' : '☀️ Light mode'; btn.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode'); btn.title = light ? 'Switch to dark mode' : 'Switch to light mode'; };
      paint(); btn.addEventListener('click', () => { const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'; document.documentElement.dataset.theme = next; localStorage.setItem('marketmind-theme', next); paint(); });
    }
  }
  function addMessage(text, who) { const box = $('chatMessages'); const bubble = document.createElement('div'); bubble.className = 'chat-bubble ' + who; const label = document.createElement('strong'); label.textContent = who === 'user' ? 'You' : 'Market Mind AI'; bubble.appendChild(label); bubble.appendChild(document.createElement('br')); bubble.appendChild(document.createTextNode(text)); box.appendChild(bubble); box.scrollTop = box.scrollHeight; }
  async function askChat(message) {
    if (!message.trim()) return;
    addMessage(message, 'user'); const input = $('advisorChatInput'); if (input) input.value = '';
    const loading = document.createElement('div'); loading.className = 'chat-bubble assistant'; loading.textContent = 'Analyzing project data…'; $('chatMessages').appendChild(loading);
    try { const res = await fetch('/api/ai-chat', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({message})}); const data = await res.json(); loading.remove(); addMessage(data.answer || data.error || 'Unable to answer right now.', 'assistant'); }
    catch (_) { loading.remove(); addMessage('Could not reach the advisor service. Please check that the Flask application is running.', 'assistant'); }
  }
  function fillExplainStocks() { const sector = $('explainSector')?.value || 'IT'; const map = {'IT':['INFY.NS','TCS.NS','WIPRO.NS','HCLTECH.NS'],'Banking':['HDFCBANK.NS','SBIN.NS','ICICIBANK.NS','AXISBANK.NS'],'Pharma':['SUNPHARMA.NS','CIPLA.NS','DRREDDY.NS'],'FMCG':['HINDUNILVR.NS','ITC.NS','NESTLEIND.NS','BRITANNIA.NS']}; const sel = $('explainStock'); if (!sel) return; const prior = sel.value; sel.replaceChildren(); (map[sector] || []).forEach(sym => { const op = document.createElement('option'); op.value = sym; op.textContent = sym.replace('.NS',''); sel.appendChild(op); }); if ((map[sector] || []).includes(prior)) sel.value = prior; }
  async function explainStock() { const result = $('explainResult'); result.innerHTML = '<p>Calculating indicators from local historical prices…</p>'; const sector = $('explainSector').value; const symbol = $('explainStock').value; try { const res = await fetch(`/api/explainable-ai?sector=${encodeURIComponent(sector)}&symbol=${encodeURIComponent(symbol)}`); const d = await res.json(); if (!res.ok) throw new Error(d.error || 'Could not calculate explanation.'); result.replaceChildren(); const summary = document.createElement('p'); summary.className = 'explain-summary'; summary.textContent = d.summary; result.appendChild(summary); const kpis = document.createElement('div'); kpis.className = 'explain-kpis'; [["Latest close", d.latest_close],["Sector",d.sector],["Rows used",d.observations],["Latest date",d.last_date]].forEach(([label,value])=>{const card=document.createElement('div');card.className='explain-kpi';const l=document.createElement('span');l.textContent=label;const v=document.createElement('strong');v.textContent=value ?? '—';card.append(l,v);kpis.appendChild(card)}); result.appendChild(kpis); const table=document.createElement('table'); table.className='feature-table'; table.innerHTML='<thead><tr><th>Factor</th><th>Value</th><th>Interpretation</th></tr></thead>'; const tbody=document.createElement('tbody'); (d.factors||[]).forEach(f=>{const tr=document.createElement('tr');[f.name,`${f.value} ${f.unit}`,f.interpretation].forEach(t=>{const td=document.createElement('td');td.textContent=t;tr.appendChild(td)});tbody.appendChild(tr)}); table.appendChild(tbody);result.appendChild(table); } catch(e) { result.textContent = e.message; } }
  async function loadNews() {
    const out = $('newsResults'), summary = $('newsSummary'), button = $('newsLoad');
    out.textContent = 'Fetching headlines from Yahoo Finance and Google News…';
    summary.replaceChildren();
    if (button) { button.disabled = true; button.textContent = 'Loading news…'; }
    try {
      const res = await fetch(`/api/news-sentiment?symbol=${encodeURIComponent($('newsSymbol').value)}`, {headers:{'Accept':'application/json'}});
      let d;
      try { d = await res.json(); } catch (_) { throw new Error(res.redirected ? 'Your login session may have expired. Log in again and retry.' : `Unexpected response from news service (HTTP ${res.status}).`); }
      if (!res.ok) throw new Error(d.error || `News request failed (HTTP ${res.status}).`);
      summary.replaceChildren();
      const stats = d.total ? [['Overall', d.overall], ['Headlines', d.total], ['Positive', d.counts?.Positive || 0], ['Negative', d.counts?.Negative || 0], ['Neutral', d.counts?.Neutral || 0]] : [['Overall', 'Unavailable'], ['Headlines', 0]];
      stats.forEach(([k,v]) => { const el=document.createElement('div'); el.className='sentiment-stat'; const label=document.createElement('span'); label.textContent=k; const value=document.createElement('strong'); value.textContent=v; el.append(label,value); summary.appendChild(el); });
      out.replaceChildren();
      if (!d.headlines?.length) { const p=document.createElement('p'); p.textContent=d.message || 'No headlines were returned by the available news providers. Try again later.'; out.appendChild(p); return; }
      const note=document.createElement('p'); note.className='feature-note'; note.textContent=d.message || ''; out.appendChild(note);
      d.headlines.forEach(h => { const card=document.createElement('article'); card.className='news-card'; const title=document.createElement(h.url ? 'a' : 'h3'); title.textContent=h.title; if(h.url){title.href=h.url;title.target='_blank';title.rel='noopener noreferrer';} const meta=document.createElement('div');meta.className='news-meta';meta.textContent=`${h.publisher} · ${h.label} sentiment · score ${h.score}`;card.append(title,meta);out.appendChild(card); });
    } catch(e) { out.textContent=e.message || 'Could not load headlines. Check your connection and retry.'; }
    finally { if (button) { button.disabled = false; button.textContent = 'Analyze Latest News'; } }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    $('advisorChatForm')?.addEventListener('submit', e=>{e.preventDefault();askChat($('advisorChatInput').value)});
    document.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',()=>askChat(b.dataset.prompt)));
    $('explainSector')?.addEventListener('change',fillExplainStocks); $('explainRun')?.addEventListener('click',explainStock); fillExplainStocks();
    $('newsLoad')?.addEventListener('click',loadNews);
  });
})();
