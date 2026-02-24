/* Doke - Comunidades Enhancements
   - Paginação/infinite scroll
   - Busca com debounce
   - Ordenação + filtro de privacidade
   - Skeleton / estado vazio / estado erro
   - Compat com HTML (filtrarComunidadesTela / filtrarComunidadesTipo)
*/
(function(){
  const w = window;
  const $ = (sel, root=document) => root.querySelector(sel);

  const TABLE = 'comunidades';
  const PAGE_SIZE = 12;

  const state = {
    client: null,
    tipo: 'todos',
    search: '',
    privacy: 'all', // all | public | private
    sort: 'recent', // recent | alpha | active
    offset: 0,
    loading: false,
    hasMore: true,
    keys: null,
    lastError: null
  };

  const ui = {
    grid: null,
    loadMoreBtn: null,
    sentinel: null,
    sortSel: null
  };

  // ---------- client detection ----------
  function isClient(o){ return !!(o && typeof o.from === 'function'); }

  function getClient(){
    // Prefer tool shim if available
    try{
      if (typeof w.getSupabaseClient === 'function'){
        const c = w.getSupabaseClient();
        if (isClient(c)) return c;
      }
    }catch(_){}
    // common aliases
    const aliases = [w.supabase, w.supabaseClient, w.sb, w.__supabaseClient, w.client];
    for (const a of aliases){
      if (isClient(a)) return a;
    }
    return null;
  }

  // ---------- helpers ----------
  function escapeHtml(str){
    return String(str ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }

  function toText(v){ return (v === null || v === undefined) ? '' : String(v); }

  function pick(obj, keys, fallback=''){
    for (const k of keys){
      if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
    }
    return fallback;
  }

  function isPrivateRow(row){
    if (!row) return false;
    if (typeof row.privado === 'boolean') return row.privado;
    if (typeof row.is_private === 'boolean') return row.is_private;
    if (typeof row.publico === 'boolean') return !row.publico;
    const t = (row.tipo || row.privacidade || '').toString().toLowerCase();
    if (t.includes('priv')) return true;
    return false;
  }

  function setActiveChip(containerSel, btn){
    try{
      const root = $(containerSel);
      if (!root) return;
      root.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
    }catch(_){}
  }

  function setActiveTab(tipo, btn){
    try{
      document.querySelectorAll('.filter-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
    }catch(_){}
    state.tipo = tipo;
  }

  // ---------- UI states ----------
  function skeletonCard(){
    return `
      <div class="skel">
        <div class="skel-cover"></div>
        <div class="skel-body">
          <div class="skel-line lg"></div>
          <div class="skel-line md"></div>
          <div class="skel-line sm"></div>
        </div>
      </div>
    `;
  }

  function renderSkeleton(count=8){
    if (!ui.grid) return;
    ui.grid.innerHTML = Array.from({length: count}).map(skeletonCard).join('');
  }

  function renderAppendSkeleton(count=4){
    if (!ui.grid) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = Array.from({length: count}).map(skeletonCard).join('');
    Array.from(wrap.children).forEach(ch => ui.grid.appendChild(ch));
    return wrap.children.length;
  }

  function clearGrid(){
    if (ui.grid) ui.grid.innerHTML = '';
  }

  function renderEmpty(){
    if (!ui.grid) return;
    ui.grid.innerHTML = `
      <div class="comm-state">
        <i class='bx bx-search-alt-2'></i>
        <h3>Nenhuma comunidade encontrada</h3>
        <p>Tente ajustar a busca ou os filtros — ou crie um grupo novo para começar a conversa.</p>
        <div class="state-actions">
          <button class="btn-state secondary" onclick="DOKE_Comms.clear()">Limpar filtros</button>
          <button class="btn-state" onclick="(window.abrirModalCriarComm?abrirModalCriarComm():alert('Abra o modal de criar grupo'))">Criar grupo</button>
        </div>
      </div>
    `;
  }

  function renderError(err){
    const msg = (err && (err.message || err.error_description || err.toString())) ? (err.message || err.toString()) : 'Erro desconhecido';
    if (!ui.grid) return;
    ui.grid.innerHTML = `
      <div class="comm-state">
        <i class='bx bx-error-circle'></i>
        <h3>Erro ao carregar comunidades</h3>
        <p>${escapeHtml(msg)}</p>
        <div class="state-actions">
          <button class="btn-state" onclick="DOKE_Comms.reload(true)">Tentar novamente</button>
          <button class="btn-state secondary" onclick="location.reload()">Recarregar página</button>
        </div>
      </div>
    `;
  }

  function setPager(){
    if (!ui.loadMoreBtn) return;
    ui.loadMoreBtn.style.display = state.hasMore ? '' : 'none';
    ui.loadMoreBtn.disabled = state.loading;
  }

  // ---------- rendering ----------
  function renderCard(row){
    const id = pick(row, ['id','uuid','grupo_id'], '');
    const nome = pick(row, ['nome','name','titulo','title'], 'Comunidade');
    const desc = pick(row, ['descrição','desc','sobre','bio'], 'Entre e participe.');
    const avatar = pick(row, ['foto','avatar','imagem','image_url'], '');
    const cover = pick(row, ['capa','cover','banner','banner_url','foto_capa'], avatar);
    const tipo = pick(row, ['tipo','categoria','category'], 'Geral');
    const priv = isPrivateRow(row) ? 'Privado' : 'Público';

    const membros = pick(row, ['membros','membros_count','members','members_count'], null);
    const membersText = (membros !== null && membros !== undefined && membros !== '') ? `${Number(membros)||0} membros` : null;

    const coverStyle = cover ? `style="background-image:url('${encodeURI(cover)}')"` : '';
    const avatarHtml = avatar
      ? `<img loading="lazy" src="${encodeURI(avatar)}" alt="">`
      : `<i class='bx bxs-group'></i>`;

    return `
      <div class="com-card" onclick="DOKE_Comms.openGroup('${escapeHtml(id)}')">
        <div class="com-cover" ${coverStyle}></div>
        <div class="com-body">
          <div class="com-avatar">${avatarHtml}</div>
          <div class="com-info">
            <div class="com-title">${escapeHtml(nome)}</div>
            <div class="com-desc">${escapeHtml(desc).slice(0, 140)}${toText(desc).length>140?'â€¦':''}</div>
            <div class="com-meta">
              <span class="pill">${escapeHtml(tipo)}</span>
              <span class="pill">${priv}</span>
              ${membersText ? `<span class="meta-small">• ${escapeHtml(membersText)}</span>` : ``}
              <button class="btn-ver-grupo" onclick="event.stopPropagation(); DOKE_Comms.openGroup('${escapeHtml(id)}')">Ver grupo</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function appendRows(rows){
    if (!ui.grid) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = rows.map(renderCard).join('');
    Array.from(wrap.children).forEach(ch => ui.grid.appendChild(ch));
  }

  // ---------- querying ----------
  async function detectKeys(){
    if (!state.client) return;
    if (state.keys) return;
    try{
      const { data, error } = await state.client.from(TABLE).select('*').limit(1);
      if (!error && Array.isArray(data) && data[0]){
        state.keys = Object.keys(data[0]);
      } else {
        state.keys = ['id','nome','descrição','foto','tipo','created_at','updated_at','privado','is_private','publico'];
      }
    }catch(_){
      state.keys = ['id','nome','descrição','foto','tipo','created_at','updated_at','privado','is_private','publico'];
    }
  }

  function buildQuery(reset){
    let q = state.client.from(TABLE).select('*', { count: 'exact' });

    // tipo
    if (state.tipo && state.tipo !== 'todos'){
      // tentativas: tipo ou categoria
      // preferimos eq('tipo', X); se falhar, tentamos categoria
      q = q.eq('tipo', state.tipo);
    }

    // busca
    const term = (state.search || '').trim();
    if (term){
      const cols = (state.keys || ['nome','descrição']).filter(k => ['nome','descrição','name','desc','sobre','bio','titulo','title'].includes(k));
      // fallback
      const c1 = cols.includes('nome') ? 'nome' : (cols.includes('name') ? 'name' : 'nome');
      const c2 = cols.includes('descrição') ? 'descrição' : (cols.includes('desc') ? 'desc' : null);
      if (c2){
        q = q.or(`${c1}.ilike.%${term}%,${c2}.ilike.%${term}%`);
      } else {
        q = q.ilike(c1, `%${term}%`);
      }
    }

    // privacidade
    if (state.privacy !== 'all'){
      // heurística: se tiver 'privado' ou 'is_private', filtra por eles; se tiver 'publico', filtra por ele.
      const keys = state.keys || [];
      if (keys.includes('privado')){
        q = q.eq('privado', state.privacy === 'private');
      } else if (keys.includes('is_private')){
        q = q.eq('is_private', state.privacy === 'private');
      } else if (keys.includes('publico')){
        q = q.eq('publico', state.privacy === 'public');
      } else {
        // sem coluna clara: não filtra
      }
    }

    // sort
    const keys = state.keys || [];
    const hasCreated = keys.includes('created_at');
    const hasUpdated = keys.includes('updated_at');

    if (state.sort === 'alpha'){
      const col = keys.includes('nome') ? 'nome' : (keys.includes('name') ? 'name' : null);
      if (col) q = q.order(col, { ascending: true });
    } else if (state.sort === 'active'){
      const col = hasUpdated ? 'updated_at' : (hasCreated ? 'created_at' : null);
      if (col) q = q.order(col, { ascending: false });
    } else {
      const col = hasCreated ? 'created_at' : (hasUpdated ? 'updated_at' : null);
      if (col) q = q.order(col, { ascending: false });
    }

    // pagination
    const from = state.offset;
    const to = state.offset + PAGE_SIZE - 1;
    q = q.range(from, to);

    return q;
  }

  async function fetchPage(reset=false){
    if (!state.client) throw new Error('Supabase client não inicializado');
    await detectKeys();

    state.loading = true;
    setPager();

    let appendedSkel = 0;
    if (reset){
      renderSkeleton(8);
    } else {
      appendedSkel = renderAppendSkeleton(4) || 0;
    }

    try{
      const q = buildQuery(reset);
      const { data, error, count } = await q;

      if (error) throw error;

      // remove skeletons appended (if any)
      if (!reset && appendedSkel){
        // remove last appended skeleton nodes
        for (let i=0;i<appendedSkel;i++){
          const last = ui.grid.lastElementChild;
          if (last && last.classList && last.classList.contains('skel')) ui.grid.removeChild(last);
        }
      }

      const rows = Array.isArray(data) ? data : [];
      if (reset){
        clearGrid();
      }

      if (reset && rows.length === 0){
        state.hasMore = false;
        renderEmpty();
        state.loading = false;
        setPager();
        return;
      }

      appendRows(rows);

      // hasMore
      const total = (typeof count === 'number') ? count : null;
      if (total !== null){
        state.hasMore = (state.offset + PAGE_SIZE) < total;
      } else {
        state.hasMore = rows.length === PAGE_SIZE;
      }

      state.offset += rows.length;
      state.lastError = null;
    } catch(err){
      state.lastError = err;
      if (reset) renderError(err);
      // if load more fails, keep current content and show toast
      if (!reset && w.showToast) w.showToast('Não foi possível carregar mais comunidades. Tente novamente.');
      state.hasMore = false;
    } finally{
      state.loading = false;
      setPager();
    }
  }

  // ---------- debounce ----------
  function debounce(fn, wait){
    let t = null;
    return function(...args){
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  const debouncedSearch = debounce((value) => {
    state.search = value || '';
    reload(true);
  }, 280);

  // ---------- public API ----------
  async function reload(reset=false){
    if (state.loading) return;
    if (reset){
      state.offset = 0;
      state.hasMore = true;
    }
    await fetchPage(true);
  }

  async function loadMore(){
    if (state.loading || !state.hasMore) return;
    await fetchPage(false);
  }

  function clear(){
    state.tipo = 'todos';
    state.search = '';
    state.privacy = 'all';
    state.sort = 'recent';
    state.offset = 0;
    state.hasMore = true;

    // reset UI controls
    try{
      const inp = $('#inputBuscaComm');
      if (inp) inp.value = '';
      if (ui.sortSel) ui.sortSel.value = 'recent';
      document.querySelectorAll('.filter-tabs .tab-btn').forEach((b,i) => {
        b.classList.toggle('active', i===0);
      });
      document.querySelectorAll('.filters-right .chip-btn').forEach((b,i) => {
        b.classList.toggle('active', i===0);
      });
    }catch(_){}
    reload(true);
  }

  function openGroup(id){
    if (!id) return;
    // Prefer existing function if project has one
    if (typeof w.abrirGrupo === 'function'){
      try{ w.abrirGrupo(id); return; }catch(_){}
    }
    // fallback
    const url = `grupo.html?id=${encodeURIComponent(id)}`;
    w.location.href = url;
  }

  function onPrivacyChange(v, btn){
    state.privacy = v;
    setActiveChip('.filters-right', btn);
    reload(true);
  }

  function onSortChange(v){
    state.sort = v || 'recent';
    reload(true);
  }

  // Compatibility with inline handlers
  w.filtrarComunidadesTela = function(value){
    debouncedSearch(value);
  };

  w.filtrarComunidadesTipo = function(tipo, btn){
    setActiveTab(tipo, btn);
    reload(true);
  };

  // export
  w.DOKE_Comms = {
    reload,
    loadMore,
    clear,
    openGroup,
    onPrivacyChange,
    onSortChange
  };

  // ---------- init ----------
  function init(){
    ui.grid = $('#listaComunidades');
    ui.loadMoreBtn = $('#btnLoadMoreComms');
    ui.sentinel = $('#commSentinel');
    ui.sortSel = $('#commSort');

    state.client = getClient();
    if (!state.client){
      console.warn('[DOKE] Comunidades enhancements: nenhum client Supabase encontrado.');
      // mantém layout anterior do script.js, mas melhora estados
      if (ui.grid){
        ui.grid.innerHTML = `
          <div class="comm-state">
            <i class='bx bx-error-circle'></i>
            <h3>Supabase não inicializado</h3>
            <p>Verifique se <b>supabase-init.js</b> está carregando e expondo o client.</p>
            <div class="state-actions">
              <button class="btn-state" onclick="location.reload()">Recarregar</button>
            </div>
          </div>
        `;
      }
      return;
    }

    // Infinite scroll (fallback to button)
    try{
      if ('IntersectionObserver' in w && ui.sentinel){
        const io = new IntersectionObserver((entries) => {
          const ent = entries[0];
          if (ent && ent.isIntersecting){
            loadMore();
          }
        }, { root: null, rootMargin: '600px 0px', threshold: 0 });
        io.observe(ui.sentinel);
      } else {
        // show load more button
        if (ui.loadMoreBtn) ui.loadMoreBtn.style.display = '';
      }
    }catch(_){
      if (ui.loadMoreBtn) ui.loadMoreBtn.style.display = '';
    }

    // initial load (override any content the legacy script injected)
    reload(true);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


