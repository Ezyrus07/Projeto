// STEP A3 - Debug overlay + request telemetry (only active with ?debug=1 or localStorage.doke_debug=1)
(function(){
  'use strict';
  if (window.__DOKE_STEP_A3__) return;
  window.__DOKE_STEP_A3__ = true;

  function isDebugEnabled(){
    try{
      const u = new URL(location.href);
      if (u.searchParams.get('debug') === '1') return true;
      if (localStorage.getItem('doke_debug') === '1') return true;
    }catch(_){ }
    return false;
  }

  if(!isDebugEnabled()) return;

  // minimal store
  const store = window.__dokeNet = window.__dokeNet || { logs: [], max: 40, startedAt: Date.now() };
  function pushLog(entry){
    try{
      store.logs.unshift(entry);
      if(store.logs.length > store.max) store.logs.length = store.max;
      window.dispatchEvent(new CustomEvent('doke:debug-update'));
    }catch(_){ }
  }

  // Wrap fetch for timing (no behavior changes)
  const origFetch = window.fetch ? window.fetch.bind(window) : null;
  if(origFetch && !window.fetch.__doke_debug_wrapped){
    window.fetch = async function(input, init){
      const t0 = performance.now();
      const url = (typeof input === 'string') ? input : (input && input.url) ? input.url : '';
      const method = (init && init.method) ? String(init.method).toUpperCase() : (input && input.method) ? String(input.method).toUpperCase() : 'GET';
      let status = 0;
      try{
        const res = await origFetch(input, init);
        status = res ? res.status : 0;
        return res;
      } finally {
        const ms = Math.round(performance.now() - t0);
        // Only log supabase-ish URLs to reduce noise
        const s = String(url||'');
        if(/\/rest\/v1\//.test(s) || /\/auth\/v1\//.test(s) || /\/storage\/v1\//.test(s) || /supabase/i.test(s)){
          pushLog({ at: Date.now(), ms, method, url: s, status });
        }
      }
    };
    window.fetch.__doke_debug_wrapped = true;
  }

  // Listen to reliability events
  window.addEventListener('doke:net-fail', (e)=>{
    try{
      const d = (e && e.detail) ? e.detail : {};
      pushLog({ at: Date.now(), ms: 0, method: 'GET', url: d.url || 'net-fail', status: d.status || 0, note: d.error || '' });
    }catch(_){ }
  });
  window.addEventListener('doke:auth-expired', (e)=>{
    try{
      const d = (e && e.detail) ? e.detail : {};
      pushLog({ at: Date.now(), ms: 0, method: 'AUTH', url: d.url || 'auth-expired', status: 401, note: 'session expired' });
    }catch(_){ }
  });

  // UI
  function el(tag, attrs){
    const n = document.createElement(tag);
    if(attrs){
      Object.keys(attrs).forEach(k=>{
        if(k==='text') n.textContent = attrs[k];
        else if(k==='html') n.innerHTML = attrs[k];
        else n.setAttribute(k, attrs[k]);
      });
    }
    return n;
  }

  function fmtTime(ts){
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit' });
  }

  let panel, list, metaSess, metaPage, fab;

  async function updateMeta(){
    try{
      metaPage.textContent = (location.pathname + location.search + location.hash).slice(0, 120);
    }catch(_){ }
    try{
      let s = null;
      if(typeof window.dokeGetSupabaseSessionSafe === 'function'){
        s = await window.dokeGetSupabaseSessionSafe();
      } else if(window.sb && window.sb.auth && typeof window.sb.auth.getSession === 'function'){
        s = await window.sb.auth.getSession();
      }
      const has = !!(s && s.data && s.data.session);
      metaSess.textContent = has ? 'OK (session)' : 'NO (needs login)';
    }catch(_){ metaSess.textContent = 'unknown'; }
  }

  function render(){
    try{
      if(!list) return;
      list.innerHTML = '';
      (store.logs || []).slice(0, store.max).forEach(it=>{
        const row = el('div', { class: 'doke-debug-row' });
        row.appendChild(el('div', { class: 't', text: (it.ms ? (it.ms+'ms') : fmtTime(it.at)) }));
        row.appendChild(el('div', { class: 'u', text: (it.method||'') + ' ' + (it.url||'') }));
        const st = el('div', { class: 's ' + ((it.status && it.status < 400) ? 'ok' : 'bad'), text: String(it.status||'') });
        row.appendChild(st);
        list.appendChild(row);
      });
    }catch(_){ }
  }

  function show(){
    panel.style.display = 'block';
    fab.style.display = 'none';
    updateMeta();
    render();
  }
  function hide(){
    panel.style.display = 'none';
    fab.style.display = 'block';
  }

  function install(){
    if(document.getElementById('doke-debug-panel')) return;

    fab = el('button', { id:'doke-debug-fab', type:'button', text:'DEBUG' });
    fab.addEventListener('click', show);

    panel = el('div', { id:'doke-debug-panel' });
    const head = el('div', { id:'doke-debug-head' });
    head.appendChild(el('b', { text:'Doke Debug' }));
    const btns = el('div', { class:'btns' });
    const btnCopy = el('button', { type:'button', text:'Copiar' });
    btnCopy.addEventListener('click', async ()=>{
      try{ await navigator.clipboard.writeText(JSON.stringify(store.logs||[], null, 2)); }catch(_){ }
    });
    const btnClear = el('button', { type:'button', text:'Limpar' });
    btnClear.addEventListener('click', ()=>{ store.logs = []; render(); });
    const btnClose = el('button', { type:'button', text:'Fechar' });
    btnClose.addEventListener('click', hide);
    btns.appendChild(btnCopy); btns.appendChild(btnClear); btns.appendChild(btnClose);
    head.appendChild(btns);

    const meta = el('div', { id:'doke-debug-meta' });
    meta.appendChild(el('div', { class:'k', text:'Sessão' }));
    metaSess = el('div', { class:'v', text:'...' });
    meta.appendChild(metaSess);
    meta.appendChild(el('div', { class:'k', text:'Página' }));
    metaPage = el('div', { class:'v', text:'...' });
    meta.appendChild(metaPage);

    list = el('div', { id:'doke-debug-list' });

    panel.appendChild(head);
    panel.appendChild(meta);
    panel.appendChild(list);

    document.body.appendChild(panel);
    document.body.appendChild(fab);

    fab.style.display = 'block';

    window.addEventListener('doke:debug-update', render);

    // Hotkey Ctrl+Shift+D
    window.addEventListener('keydown', (ev)=>{
      try{
        if(ev.ctrlKey && ev.shiftKey && (ev.key==='D' || ev.key==='d')){
          if(panel.style.display==='block') hide(); else show();
        }
      }catch(_){ }
    });

    // keep meta fresh
    setInterval(updateMeta, 4000);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();

})();
