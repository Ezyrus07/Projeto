(function(){
  // DOKE Sidebar Search (Lite)
  // - Enables "Pesquisar" inline inside the sidebar (no navigation)
  // - Designed for pages that do NOT load script.js (e.g., mensagens.html, pedido.html)
  // Build: 20260305v1

  if (window.__DOKE_SIDEBAR_SEARCH_LITE__ === true) return;
  window.__DOKE_SIDEBAR_SEARCH_LITE__ = true;

  const SB_PICK = () => window.sb || window.supabaseClient || window.sbClient || window.supabase;
  const MODE_KEY = 'doke_ig_search_mode_v1';
  const USER_HIST_KEY = 'doke_user_quicksearch_hist_v2';
  const ADS_HIST_KEY  = 'doke_historico_busca';

  const readKey = (key, fb=[]) => {
    try{
      const raw = localStorage.getItem(key);
      const v = raw ? JSON.parse(raw) : fb;
      return Array.isArray(v) ? v : fb;
    }catch(e){ return fb; }
  };
  const writeKey = (key, v) => { try{ localStorage.setItem(key, JSON.stringify(v)); }catch(e){} };

  function ensureStyles(){
    // If full UX stylesheet exists, do nothing.
    try{
      const hasUx = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .some(l => String(l.getAttribute('href')||'').includes('doke-ux.css'));
      if (hasUx) return;
    }catch(_e){}

    if (document.getElementById('doke-ig-search-lite-css')) return;
    const css = document.createElement('style');
    css.id = 'doke-ig-search-lite-css';
    css.textContent = `
      .sidebar-icones{ position: relative; }
      .ig-search-screen{ display:none; }
      .sidebar-icones.ig-search-open .item{ display:none !important; }
      .sidebar-icones.ig-search-open #logo{ display:block !important; }
      .sidebar-icones.ig-search-open .ig-search-screen{
        display:flex; flex-direction:column;
        position:absolute; left:0; right:0; bottom:0;
        top: var(--ig-search-top, 78px);
        background: linear-gradient(180deg, rgba(255,255,255,.98) 0%, rgba(244,247,246,.98) 100%);
        border-top: 1px solid rgba(2,6,23,.06);
        z-index: 1100;
        padding: 14px 0 16px;
        overflow: hidden;
      }
      .ig-search-top{ display:flex; align-items:center; justify-content:space-between; padding: 6px 16px 12px; }
      .ig-search-title{ font-size: 20px; font-weight: 800; letter-spacing: -0.02em; color: #0f172a; }
      .ig-search-close{
        width: 40px; height: 40px; border-radius: 14px;
        border: 1px solid rgba(11,119,104,0.25);
        background: rgba(11,119,104,0.10);
        color: #0b7768;
        display:flex; align-items:center; justify-content:center;
        cursor:pointer;
      }
      .ig-search-inputwrap{
        margin: 0 14px 10px; padding: 10px 12px;
        border-radius: 999px;
        display:flex; align-items:center; gap: 10px;
        border: 1px solid rgba(42,95,144,0.22);
        background: rgba(255,255,255,0.85);
        box-shadow: 0 10px 24px rgba(2,6,23,0.06);
      }
      .ig-search-inputwrap i{ font-size: 18px; color: rgba(42,95,144,0.95); }
      .ig-search-input{
        flex:1; border:0; outline:0; background:transparent;
        font-size: 15px; color:#0f172a;
      }
      .ig-search-input::placeholder{ color: rgba(15,23,42,.55); }
      .ig-search-inputwrap .ig-search-clear{
        width: 30px; height: 30px; border-radius: 999px;
        border: 1px solid rgba(2,6,23,0.10);
        background: rgba(2,6,23,0.05);
        color: rgba(15,23,42,0.65);
        display:flex; align-items:center; justify-content:center;
        cursor:pointer; opacity:0; pointer-events:none;
        transition: opacity .12s ease, transform .12s ease;
        transform: scale(.96);
      }
      .ig-search-inputwrap.has-value .ig-search-clear{ opacity:1; pointer-events:auto; transform: scale(1); }
      .ig-search-tabs{ display:flex; gap: 10px; padding: 8px 14px 10px; }
      .ig-tab{
        flex:1; padding: 10px 12px; border-radius: 999px;
        border: 1px solid rgba(11,119,104,0.22);
        background: rgba(255,255,255,0.72);
        color: rgba(11,119,104,0.95);
        font-weight: 700; cursor:pointer;
      }
      .ig-tab.is-active{
        border-color: transparent;
        background: linear-gradient(90deg,#0b7768,#6caea6);
        color: #fff;
      }
      .ig-search-body{ flex:1; min-height:0; overflow:auto; padding-bottom: 12px; overscroll-behavior: contain; }
      .ig-recents-head{
        display:flex; justify-content:space-between; align-items:baseline;
        padding: 10px 16px 8px;
        position: sticky; top: 0; z-index: 2;
        background: linear-gradient(180deg, rgba(255,255,255,.96) 0%, rgba(244,247,246,.88) 100%);
        backdrop-filter: blur(8px);
      }
      .ig-recents-head .ig-recents-title{ font-weight: 800; color: rgba(15,23,42,0.92); }
      .ig-recents-head .ig-recents-clearall{
        border: 0; background: transparent;
        color: #2a5f90; font-weight: 700; cursor:pointer;
      }
      .ig-recents-list, .ig-search-results{ padding: 6px 10px 18px; }
      .ig-row{
        display:flex; align-items:center; gap:12px;
        padding: 10px 10px; border-radius: 16px;
        cursor:pointer; transition: background .12s ease;
      }
      .ig-row:hover{ background: rgba(2,6,23,0.05); }
      .ig-ico{
        width:42px; height:42px; border-radius:999px;
        display:grid; place-items:center;
        background: rgba(42,95,144,0.10);
        color: rgba(42,95,144,0.95);
        flex: 0 0 auto;
      }
      .ig-avatar{ width:42px; height:42px; border-radius:999px; object-fit:cover; }
      .ig-main{ min-width:0; flex:1; }
      .ig-line1{ font-weight:900; color: rgba(15,23,42,0.92); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .ig-line2{ font-size: 13px; color: rgba(15,23,42,0.60); margin-top: 2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .ig-remove{
        width: 34px; height: 34px; border-radius: 14px;
        border: 1px solid rgba(2,6,23,0.10);
        background: rgba(255,255,255,0.80);
        color: rgba(15,23,42,0.70);
        display:flex; align-items:center; justify-content:center;
        cursor:pointer; flex: 0 0 auto;
      }
      .ig-empty{
        display:flex; align-items:center; gap:10px;
        padding: 12px 10px; color: rgba(15,23,42,0.72);
      }
      .ig-empty i{ font-size: 18px; opacity: .8; }
      .ig-loading{ padding: 12px 10px; color: rgba(15,23,42,0.72); font-weight:700; }
    `;
    document.head.appendChild(css);
  }

  function normalizeSidebarToIndexModel(sidebar){
    if(!sidebar) return false;
    if(sidebar.dataset.indexSidebarNormalized === '1') return true;

    const current = String((window.location.pathname || '').split('/').pop() || '').toLowerCase();
    const isActive = (href) => String(href || '').split('?')[0].trim().toLowerCase() === current;
    const itemClass = (href) => isActive(href) ? 'item active' : 'item';

    sidebar.innerHTML = `
      <div id="logo">
        <a href="index.html"><img src="assets/Imagens/doke-logo.png" alt="Logotipo da plataforma Doke" loading="lazy" decoding="async"></a>
      </div>
      <div class="${itemClass('index.html')}">
        <a href="index.html"><i class='bx bx-home-alt icon azul'></i><span>Inicio</span></a>
      </div>
      <div class="item" id="pvSearchSidebarItem">
        <a href="#" class="pv-search-toggle" aria-label="Pesquisar"><i class='bx bx-search-alt-2 icon azul'></i><span>Pesquisar</span></a>
      </div>
      <div class="${itemClass('negocios.html')}">
        <a href="negocios.html"><i class='bx bx-store icon verde'></i><span>Negocios</span></a>
      </div>
      <div class="${itemClass('notificacoes.html')}">
        <a href="notificacoes.html"><i class='bx bx-bell icon azul'></i><span>Notificacoes</span></a>
      </div>
      <div class="${itemClass('mensagens.html')}">
        <a href="mensagens.html?aba=conversas"><i class='bx bx-message-rounded-dots icon azul'></i><span>Mensagens</span></a>
      </div>
      <div class="${itemClass('pedidos.html')}">
        <a href="pedidos.html"><i class='bx bx-package icon verde'></i><span>Pedidos</span></a>
      </div>
      <div class="${itemClass('comunidade.html')}">
        <a href="comunidade.html"><i class='bx bx-group icon verde'></i><span>Comunidades</span></a>
      </div>
      <div class="item">
        <a href="#" onclick="irParaMeuPerfil(event)"><i class='bx bx-user icon verde'></i><span>Perfil</span></a>
      </div>
      <div class="${itemClass('mais.html')}">
        <a href="mais.html"><i class='bx bx-menu icon azul'></i><span>Mais</span></a>
      </div>
    `;
    sidebar.dataset.indexSidebarNormalized = '1';
    return true;
  }

  function escapeHtml(v){
    return String(v ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function normalizeHandle(value){
    const s = String(value || '').trim().replace(/\s+/g,' ');
    const base = s.startsWith('@') ? s.slice(1) : s;
    const clean = base.replace(/[^a-zA-Z0-9._]/g,'');
    return '@' + (clean || 'usuario');
  }

  function ensureSearchScreen(sidebar){
    let item = sidebar.querySelector('#pvSearchSidebarItem');
    if(!item){
      item = document.createElement('div');
      item.className = 'item';
      item.id = 'pvSearchSidebarItem';
      item.innerHTML = `
        <a href="#" class="pv-search-toggle" aria-label="Pesquisar">
          <i class='bx bx-search-alt-2 icon azul'></i>
          <span>Pesquisar</span>
        </a>
      `;
      sidebar.insertBefore(item, sidebar.children[1] || null);
    }

    let screen = sidebar.querySelector('.ig-search-screen');
    if(!screen){
      screen = document.createElement('div');
      screen.className = 'ig-search-screen';
      screen.innerHTML = `
        <div class="ig-search-top">
          <div class="ig-search-title">Pesquisa</div>
          <button class="ig-search-close" type="button" aria-label="Fechar">
            <i class='bx bx-x'></i>
          </button>
        </div>

        <div class="ig-search-inputwrap" role="search">
          <label class="sr-only" for="igSearchInput">Pesquisar</label>
          <i class='bx bx-search'></i>
          <input class="ig-search-input" id="igSearchInput" name="igSearchInput" type="text" placeholder="Pesquisar usuarios" autocomplete="off" />
          <button class="ig-search-clear" type="button" aria-label="Limpar">
            <i class='bx bx-x'></i>
          </button>
        </div>

        <div class="ig-search-tabs" role="tablist" aria-label="Tipo de pesquisa">
          <button type="button" class="ig-tab is-active" data-mode="users" role="tab" aria-selected="true">Usuarios</button>
          <button type="button" class="ig-tab" data-mode="ads" role="tab" aria-selected="false">Anuncios</button>
        </div>

        <div class="ig-search-body">
          <div class="ig-recents-head">
            <div class="ig-recents-title">Recentes</div>
            <button class="ig-recents-clearall" type="button">Limpar tudo</button>
          </div>

          <div class="ig-recents-list" role="list"></div>
          <div class="ig-search-results" role="list" aria-live="polite"></div>
        </div>
      `;
      sidebar.appendChild(screen);
    }

    // compute top offset
    try{
      const logoEl = sidebar.querySelector('#logo');
      if(logoEl){
        const h = (logoEl.getBoundingClientRect && logoEl.getBoundingClientRect().height) || logoEl.offsetHeight || 0;
        const top = Math.max(64, Math.round(h + 10));
        sidebar.style.setProperty('--ig-search-top', top + 'px');
      }
    }catch(_e){}

    return { item, screen };
  }

  function readUserRecents(){
    const arr = readKey(USER_HIST_KEY, []);
    return arr.filter(x => x && typeof x === 'object' && x.t === 'user');
  }
  function writeUserRecents(list){
    const others = readKey(USER_HIST_KEY, []).filter(x => !(x && typeof x === 'object' && x.t === 'user'));
    writeKey(USER_HIST_KEY, [...list, ...others].slice(0, 18));
  }

  function readAdsRecents(){
    const arr = readKey(ADS_HIST_KEY, []);
    return arr.map(x=>{
      if(!x) return null;
      if(typeof x === 'string') return { q:x, ts:0 };
      if(typeof x === 'object') return x;
      return null;
    }).filter(Boolean);
  }
  function writeAdsRecents(list){
    const arr = (list||[]).map(x=>{
      if(!x) return null;
      if(typeof x === 'string') return x;
      if(typeof x === 'object') return (x.q||'');
      return null;
    }).filter(Boolean).map(s=>String(s).trim()).filter(Boolean);
    writeKey(ADS_HIST_KEY, arr.slice(0, 24));
  }

  function removeUser(uid){
    uid = String(uid||'');
    let arr = readUserRecents().filter(x => String(x.uid||'') !== uid);
    writeUserRecents(arr);
  }
  function removeAd(q){
    const term = String(q||'').trim();
    let arr = readAdsRecents().filter(x => String(x.q||'').trim() !== term);
    writeAdsRecents(arr);
  }
  function clearAllRecents(mode){
    if(mode === 'ads') writeAdsRecents([]);
    else writeUserRecents([]);
  }
  function rememberAdTerm(term){
    const q = String(term||'').trim();
    if(q.length < 2) return;
    let arr = readAdsRecents().filter(x => String(x.q||'').trim().toLowerCase() !== q.toLowerCase());
    arr = [{ q, ts: Date.now() }, ...arr];
    writeAdsRecents(arr);
  }

  async function sbSearchUsuarios(term){
    const sb = SB_PICK();
    if(!sb || typeof sb.from !== 'function') return [];
    const q = String(term || '').trim();
    if(q.length < 2) return [];
    const like = `%${q.replace(/[%_]/g,'')}%`;

    try{
      const resp = await sb
        .from('usuarios')
        .select('uid,id,user,nome,email,foto,avatar,foto_url,isProfissional,tipo,role,categoria_profissional')
        .or(`nome.ilike.${like},user.ilike.${like},email.ilike.${like}`)
        .limit(12);

      if (resp?.error) return [];
      return Array.isArray(resp?.data) ? resp.data : [];
    }catch(_e){
      return [];
    }
  }

  function init(sidebar){
    if(!sidebar || sidebar.dataset.igSearchLiteBound === '1') return false;
    sidebar.dataset.igSearchLiteBound = '1';

    ensureStyles();

    // normalize sidebar to index model if needed (many pages have slightly different DOM)
    normalizeSidebarToIndexModel(sidebar);

    const { item, screen } = ensureSearchScreen(sidebar);

    const inputWrap = screen.querySelector('.ig-search-inputwrap');
    const input = screen.querySelector('.ig-search-input');
    const btnClose = screen.querySelector('.ig-search-close');
    const btnClear = screen.querySelector('.ig-search-clear');
    const clearAll = screen.querySelector('.ig-recents-clearall');
    const recentsEl = screen.querySelector('.ig-recents-list');
    const resultsEl = screen.querySelector('.ig-search-results');
    const tabs = Array.from(screen.querySelectorAll('.ig-tab'));

    const syncClear = () => {
      try{
        const has = !!(input && input.value && input.value.trim());
        inputWrap && inputWrap.classList.toggle('has-value', has);
      }catch(_e){}
    };

    let mode = (readKey(MODE_KEY, ['users'])[0] || 'users');
    if (mode !== 'users' && mode !== 'ads') mode = 'users';

    function setMode(next){
      mode = next === 'ads' ? 'ads' : 'users';
      writeKey(MODE_KEY, [mode]);
      tabs.forEach(t=>{
        const on = t.dataset.mode === mode;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      input.placeholder = mode === 'ads' ? 'Pesquisar Anuncios' : 'Pesquisar usuarios';
      syncClear();
      render();
      try{ input.focus(); input.select(); }catch(_e){}
    }

    function rowEmpty(message){
      const msg = message || (mode === 'ads' ? 'Nenhuma pesquisa recente.' : 'Nenhum Usuario recente.');
      return `<div class="ig-empty" role="listitem"><i class='bx bx-search'></i><div>${escapeHtml(msg)}</div></div>`;
    }

    function renderRecents(){
      resultsEl.innerHTML = '';
      if(mode === 'users'){
        const users = readUserRecents();
        if(!users.length){
          recentsEl.innerHTML = rowEmpty();
          return;
        }
        recentsEl.innerHTML = users.slice(0, 12).map(u=>{
          const uid = String(u.uid||'').trim();
          const foto = u.foto || `https://i.pravatar.cc/88?u=${encodeURIComponent(uid||'u')}`;
          const handle = escapeHtml(String(u.handle||'@usuario'));
          const nome = escapeHtml(String(u.nome||''));
          const isProf = u.isProf ? 'Profissional' : 'Usuario';
          const goto = u.isProf ? `perfil-profissional.html?uid=${encodeURIComponent(uid)}` : `perfil-usuario.html?uid=${encodeURIComponent(uid)}`;
          return `
            <div class="ig-row" role="listitem" data-uid="${escapeHtml(uid)}" data-goto="${escapeHtml(goto)}">
              <img class="ig-avatar" src="${escapeHtml(foto)}" alt="">
              <div class="ig-main">
                <div class="ig-line1">${handle}</div>
                <div class="ig-line2">${nome || isProf}</div>
              </div>
              <button class="ig-remove" type="button" aria-label="Remover"><i class='bx bx-x'></i></button>
            </div>
          `;
        }).join('');
        recentsEl.querySelectorAll('.ig-row').forEach(row=>{
          const goto = row.getAttribute('data-goto') || '';
          const uid = row.getAttribute('data-uid') || '';
          row.addEventListener('click', (e)=>{
            if(e.target && e.target.closest('.ig-remove')) return;
            if(goto) window.location.href = goto;
          });
          row.querySelector('.ig-remove')?.addEventListener('click', (e)=>{
            e.preventDefault(); e.stopPropagation();
            removeUser(uid);
            renderRecents();
          });
        });
        return;
      }

      const ads = readAdsRecents();
      if(!ads.length){
        recentsEl.innerHTML = rowEmpty('Nenhuma pesquisa recente.');
        return;
      }
      recentsEl.innerHTML = ads.slice(0, 12).map(a=>{
        const q = escapeHtml(String(a.q||''));
        return `
          <div class="ig-row" role="listitem" data-q="${q}">
            <div class="ig-ico"><i class='bx bx-search'></i></div>
            <div class="ig-main">
              <div class="ig-line1">${q}</div>
              <div class="ig-line2">Pesquisar Anuncios</div>
            </div>
            <button class="ig-remove" type="button" aria-label="Remover"><i class='bx bx-x'></i></button>
          </div>
        `;
      }).join('');

      recentsEl.querySelectorAll('.ig-row').forEach(row=>{
        const q = row.getAttribute('data-q') || '';
        row.addEventListener('click', (e)=>{
          if(e.target && e.target.closest('.ig-remove')) return;
          input.value = q;
          syncClear();
          render();
          input.focus();
        });
        row.querySelector('.ig-remove')?.addEventListener('click', (e)=>{
          e.preventDefault(); e.stopPropagation();
          removeAd(q);
          renderRecents();
        });
      });
    }

    function showAdSearchAction(q){
      const term = String(q||'').trim();
      resultsEl.innerHTML = '';
      if(term.length < 2) return;
      resultsEl.innerHTML = `
        <div class="ig-row" role="listitem" data-q="${escapeHtml(term)}">
          <div class="ig-ico"><i class='bx bx-right-arrow-alt'></i></div>
          <div class="ig-main">
            <div class="ig-line1">Pesquisar Anuncios por "${escapeHtml(term)}"</div>
            <div class="ig-line2">Abrir resultados</div>
          </div>
        </div>
      `;
      resultsEl.querySelector('.ig-row')?.addEventListener('click', ()=>{
        rememberAdTerm(term);
        window.location.href = `busca.html?q=${encodeURIComponent(term)}&src=sidebar`;
      });
    }

    async function runUserSearch(q){
      const term = String(q||'').trim();
      resultsEl.innerHTML = '';
      if(term.length < 2) return;

      resultsEl.innerHTML = `<div class="ig-loading">Buscando...</div>`;
      const list = await sbSearchUsuarios(term);
      if(!list.length){
        resultsEl.innerHTML = `<div class="ig-empty" role="listitem"><i class='bx bx-search'></i><div>Nada encontrado.</div></div>`;
        return;
      }

      resultsEl.innerHTML = list.map(u=>{
        const uid = String(u.uid || u.id || '').trim();
        const foto = (u.foto || u.foto_url || u.avatar) || `https://i.pravatar.cc/88?u=${encodeURIComponent(uid||'u')}`;
        const nome = String(u.nome || '').trim();
        const handle = normalizeHandle(u.user || (nome ? nome.split(' ')[0] : 'usuario'));
        const isProf = (u.isProfissional === true) || String(u.tipo||'').toLowerCase() === 'profissional' || String(u.role||'').toLowerCase() === 'profissional';
        const categoria = String(u.categoria_profissional || 'Profissional');
        const sub = isProf ? categoria : (nome || 'Usuario');
        const goto = isProf ? `perfil-profissional.html?uid=${encodeURIComponent(uid)}` : `perfil-usuario.html?uid=${encodeURIComponent(uid)}`;

        return `
          <div class="ig-row" role="listitem" data-uid="${escapeHtml(uid)}" data-goto="${escapeHtml(goto)}" data-handle="${escapeHtml(handle)}" data-nome="${escapeHtml(nome)}" data-foto="${escapeHtml(foto)}" data-isprof="${isProf ? '1' : '0'}">
            <img class="ig-avatar" src="${escapeHtml(foto)}" alt="">
            <div class="ig-main">
              <div class="ig-line1">${escapeHtml(handle)}</div>
              <div class="ig-line2">${escapeHtml(sub)}</div>
            </div>
          </div>
        `;
      }).join('');

      resultsEl.querySelectorAll('.ig-row').forEach(row=>{
        row.addEventListener('click', ()=>{
          const uid = row.getAttribute('data-uid') || '';
          const goto = row.getAttribute('data-goto') || '';
          const handle = row.getAttribute('data-handle') || '';
          const nome = row.getAttribute('data-nome') || '';
          const foto = row.getAttribute('data-foto') || '';
          const isProf = row.getAttribute('data-isprof') === '1';

          let arr = readUserRecents();
          arr = arr.filter(x => String(x.uid||'') !== String(uid));
          arr = [{ t:'user', uid, handle, nome, foto, isProf, ts: Date.now() }, ...arr];
          writeUserRecents(arr);

          if (goto) window.location.href = goto;
        });
      });
    }

    function render(){
      renderRecents();
      const term = (input.value || '').trim();
      if(term.length >= 2){
        if(mode === 'ads') showAdSearchAction(term);
        else runUserSearch(term);
      }else{
        resultsEl.innerHTML = '';
      }
    }

    function open(){
      try{ sidebar.classList.add('menu-aberto'); document.body.classList.add('menu-ativo'); }catch(_e){}
      sidebar.classList.add('ig-search-open');
      setMode(mode);
      setTimeout(()=>{ try{ input.focus(); input.select(); }catch(_e){} }, 50);
    }
    function close(){
      sidebar.classList.remove('ig-search-open');
      input.value = '';
      syncClear();
      resultsEl.innerHTML = '';
      renderRecents();
    }

    window.openDokeSidebarSearch = open;

    // events
    item.querySelector('.pv-search-toggle')?.addEventListener('click', (e)=>{ e.preventDefault(); open(); });
    btnClose?.addEventListener('click', close);
    btnClear?.addEventListener('click', ()=>{ input.value=''; syncClear(); resultsEl.innerHTML=''; renderRecents(); input.focus(); });
    clearAll?.addEventListener('click', ()=>{ clearAllRecents(mode); renderRecents(); });
    tabs.forEach(t => t.addEventListener('click', ()=> setMode(t.dataset.mode)));

    let timer = null;
    input?.addEventListener('input', ()=>{
      syncClear();
      clearTimeout(timer);
      timer = setTimeout(render, 220);
    });
    input?.addEventListener('keydown', (e)=>{
      if(e.key === 'Escape'){ e.preventDefault(); close(); return; }
      if(e.key === 'Enter'){
        const term = input.value.trim();
        if(mode === 'ads' && term.length >= 2){
          rememberAdTerm(term);
          window.location.href = `busca.html?q=${encodeURIComponent(term)}&src=sidebar`;
        }
      }
    });
    document.addEventListener('keydown', (e)=>{
      if(e.key === 'Escape' && sidebar.classList.contains('ig-search-open')) close();
      if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){
        // Shortcut: Ctrl/Cmd+K
        if (!sidebar.classList.contains('ig-search-open')) {
          e.preventDefault();
          open();
        }
      }
    });

    // initial state
    setMode(mode);
    return true;
  }

  function boot(){
    // If script.js already provides the full implementation, skip.
    try{
      if (window.__DOKE_SIDEBAR_SEARCH_FULL__ === true) return;
    }catch(_e){}
    const sidebar = document.querySelector('aside.sidebar-icones, .sidebar-icones');
    if(!sidebar) return false;
    init(sidebar);
    return true;
  }

  let tries = 0;
  const maxTries = 25;
  const loop = () => {
    tries += 1;
    if (boot()) return;
    if (tries >= maxTries) return;
    setTimeout(loop, 220);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loop, { once: true });
  } else {
    loop();
  }
  window.addEventListener('load', loop, { once: true });
})();


