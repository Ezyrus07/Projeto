(function(){
  const state = {
    groups: [],
    mine: [],
    filter: 'all',
    query: '',
    userId: '',
  };

  const els = {
    grid: document.getElementById('communityGrid'),
    search: document.getElementById('communitySearchInput'),
    statTotal: document.getElementById('statTotal'),
    statMine: document.getElementById('statMine'),
    myGroups: document.getElementById('myGroupsList'),
    modal: document.getElementById('communityModal'),
    form: document.getElementById('communityCreateForm'),
    openModal: document.getElementById('openCreateCommunity'),
    refresh: document.getElementById('refreshCommunities'),
    filterTrack: document.getElementById('communityFilterTrack'),
    prev: document.getElementById('filterPrev'),
    next: document.getElementById('filterNext'),
  };

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function norm(text){
    return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  }

  async function resolveUserId(){
    const sb = window.sb || window.supabaseClient || window.supabase || null;
    try {
      if (sb?.auth?.getSession) {
        const { data } = await sb.auth.getSession();
        const user = data?.session?.user;
        if (user?.id) {
          localStorage.setItem('doke_uid', user.id);
          return user.id;
        }
      }
    } catch(_){}
    return String(localStorage.getItem('doke_uid') || '').trim();
  }

  function getTypeLabel(raw){
    const text = String(raw || 'Grupo').trim();
    const map = {
      'pro': 'Pro',
      'profissional': 'Profissional',
      'condominio': 'Condomínio',
      'condomínio': 'Condomínio',
      'hobby': 'Hobby',
      'publico': 'Público',
      'público': 'Público',
      'privado': 'Privado',
    };
    const key = norm(text);
    return map[key] || text;
  }

  function coerceGroup(raw, index){
    const id = String(raw.id || raw.comunidade_id || raw.uuid || raw._id || `group-${index}`).trim();
    const title = raw.nome || raw.titulo || raw.name || 'Comunidade';
    const description = raw.descricao || raw.descrição || raw.resumo || 'Sem descrição por enquanto.';
    const type = getTypeLabel(raw.tipo || raw.tipo_comunidade || raw.category);
    const privacy = getTypeLabel(raw.privacidade || raw.visibility || 'Público');
    const cover = raw.capa_url || raw.capa || raw.imagem_capa || raw.cover || '';
    const avatar = raw.thumb_url || raw.icone_url || raw.avatar || '';
    const membersRaw = Array.isArray(raw.membros) ? raw.membros.length : (Number(raw.membros_count ?? raw.membrosCount ?? raw.membros_total) || 0);
    const createdAt = raw.created_at || raw.dataCriacao || raw.createdAt || raw.updated_at || null;
    return { id, title, description, type, privacy, cover, avatar, members: membersRaw, createdAt, raw };
  }

  function fallbackGroups(){
    return [
      { id:'sample-1', title:'Teste', description:'Teste', type:'Pro', privacy:'Público', cover:'assets/Imagens/relogio.jpg', avatar:'', members:2, createdAt:new Date().toISOString(), raw:{} },
      { id:'sample-2', title:'Testee', description:'Teste', type:'Condomínio', privacy:'Público', cover:'assets/Imagens/paisagem-neve.jpg', avatar:'', members:1, createdAt:new Date().toISOString(), raw:{} },
    ];
  }

  function renderSkeleton(){
    els.grid.innerHTML = `
      <div class="community-skeleton-grid">
        ${Array.from({length:4}).map(() => `
          <article class="community-skeleton">
            <div class="community-skeleton__cover"></div>
            <div class="community-skeleton__body">
              <div class="community-skeleton__head">
                <div class="community-skeleton__avatar"></div>
                <div style="display:grid;gap:10px;flex:1;">
                  <div class="community-skeleton__line title"></div>
                  <div class="community-skeleton__line medium"></div>
                  <div class="community-skeleton__line short"></div>
                </div>
              </div>
              <div class="community-skeleton__meta">
                <div class="community-skeleton__pill"></div>
                <div class="community-skeleton__pill"></div>
                <div class="community-skeleton__pill"></div>
              </div>
              <div class="community-skeleton__button"></div>
            </div>
          </article>
        `).join('')}
      </div>`;
    els.myGroups.innerHTML = Array.from({length:2}).map(() => `
      <div class="community-mini-card">
        <div class="community-mini-card__thumb" style="background:#fff"></div>
        <div><div class="community-mini-card__title">Carregando...</div><div class="community-mini-card__meta">Aguarde</div></div>
      </div>
    `).join('');
  }

  async function fetchMembershipMap(groupIds){
    const sb = window.sb || window.supabaseClient || window.supabase || null;
    const map = new Map();
    if (!state.userId || !sb?.from || !groupIds.length) return map;
    try {
      const { data, error } = await sb.from('comunidade_membros').select('*').eq('user_id', state.userId).in('comunidade_id', groupIds);
      if (!error && Array.isArray(data)) {
        data.forEach((row) => {
          map.set(String(row.comunidade_id), String(row.status || 'active').toLowerCase());
        });
      }
    } catch(_){}
    return map;
  }

  async function loadGroups(){
    renderSkeleton();
    state.userId = await resolveUserId();
    const sb = window.sb || window.supabaseClient || window.supabase || null;
    let groups = [];

    if (sb?.from) {
      try {
        let res = await sb.from('comunidades').select('*').order('created_at', { ascending:false }).limit(36);
        if (res.error) {
          res = await sb.from('comunidades').select('*').order('dataCriacao', { ascending:false }).limit(36);
        }
        if (!res.error && Array.isArray(res.data) && res.data.length) {
          groups = res.data.map(coerceGroup);
        }
      } catch(_){}
    }

    if (!groups.length) {
      try {
        const cache = JSON.parse(localStorage.getItem('doke_comunidades_cache') || '[]');
        if (Array.isArray(cache) && cache.length) groups = cache.map(coerceGroup);
      } catch(_){}
    }

    if (!groups.length) groups = fallbackGroups();

    state.groups = groups;
    try { localStorage.setItem('doke_comunidades_cache', JSON.stringify(groups)); } catch(_){}

    const membership = await fetchMembershipMap(groups.map((g) => g.id));
    state.mine = groups.filter((group) => {
      if (membership.get(group.id) === 'active') return true;
      const members = Array.isArray(group.raw?.membros) ? group.raw.membros : [];
      return state.userId && members.some((entry) => String(entry?.uid || entry?.id || entry) === state.userId);
    });

    renderMyGroups();
    renderGrid();
  }

  function matchesFilter(group){
    const queryOk = !state.query || norm(`${group.title} ${group.description} ${group.type} ${group.privacy}`).includes(norm(state.query));
    if (!queryOk) return false;
    const filter = state.filter;
    if (filter === 'all') return true;
    if (filter === 'trending') return group.members >= 2 || norm(group.type).includes('pro');
    if (filter === 'near') return /condom|bairro|vizinh|cidade/.test(norm(`${group.type} ${group.description}`));
    if (filter === 'new') return true;
    if (filter === 'pro') return norm(group.type).includes('pro') || norm(group.type).includes('prof');
    if (filter === 'condominio') return norm(group.type).includes('condom');
    if (filter === 'hobby') return norm(group.type).includes('hobby');
    return true;
  }

  function renderGrid(){
    const visible = state.groups.filter(matchesFilter);
    els.statTotal.textContent = String(visible.length);
    els.statMine.textContent = String(state.mine.length);

    if (!visible.length) {
      els.grid.innerHTML = `
        <div class="community-empty">
          <div>
            <i class='bx bx-group' style="font-size:2.8rem;color:#8ea0b5"></i>
            <h3>Nenhuma comunidade encontrada</h3>
            <p>Não achei grupos para esse filtro agora. Ajuste a busca ou crie uma comunidade nova para começar.</p>
          </div>
        </div>`;
      return;
    }

    els.grid.innerHTML = visible.map((group) => {
      const thumbStyle = group.avatar ? `style="background-image:url('${esc(group.avatar)}')"` : '';
      const coverStyle = group.cover ? `style="background-image:url('${esc(group.cover)}')"` : '';
      const joined = state.mine.some((mine) => mine.id === group.id);
      return `
        <article class="community-card" data-id="${esc(group.id)}">
          <div class="community-card__cover" ${coverStyle}></div>
          <div class="community-card__body">
            <div class="community-card__header">
              <div class="community-card__identity">
                <div class="community-card__avatar" ${thumbStyle}>${group.avatar ? '' : `<i class='bx bx-group'></i>`}</div>
                <div>
                  <h3 class="community-card__title">${esc(group.title)}</h3>
                  <p class="community-card__desc">${esc(group.description)}</p>
                </div>
              </div>
              <button type="button" class="community-card__join">${joined ? 'Entrou' : 'Entrar'}</button>
            </div>
            <div class="community-card__meta">
              <span class="community-pill">${esc(group.type)}</span>
              <span class="community-pill">${esc(group.privacy)}</span>
              <span class="community-meta-count">+${group.members} membros</span>
            </div>
          </div>
        </article>`;
    }).join('');
  }

  function renderMyGroups(){
    if (!state.mine.length) {
      els.myGroups.innerHTML = `
        <div class="community-mini-card">
          <div class="community-mini-card__thumb"><i class='bx bx-group'></i></div>
          <div>
            <div class="community-mini-card__title">Nenhum grupo ainda</div>
            <div class="community-mini-card__meta">Participe de uma comunidade para vê-la aqui.</div>
          </div>
        </div>`;
      return;
    }
    els.myGroups.innerHTML = state.mine.map((group) => {
      const thumbStyle = group.avatar ? `style="background-image:url('${esc(group.avatar)}')"` : '';
      return `
        <div class="community-mini-card">
          <div class="community-mini-card__thumb" ${thumbStyle}>${group.avatar ? '' : `<i class='bx bx-group'></i>`}</div>
          <div>
            <div class="community-mini-card__title">${esc(group.title)}</div>
            <div class="community-mini-card__meta">${esc(group.type)} · ${group.members} membros</div>
          </div>
        </div>`;
    }).join('');
  }

  function bindFilters(){
    els.filterTrack?.querySelectorAll('[data-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        els.filterTrack.querySelectorAll('[data-filter]').forEach((el) => el.classList.remove('is-active'));
        button.classList.add('is-active');
        state.filter = button.dataset.filter;
        renderGrid();
      });
    });
    els.prev?.addEventListener('click', () => els.filterTrack.scrollBy({ left:-260, behavior:'smooth' }));
    els.next?.addEventListener('click', () => els.filterTrack.scrollBy({ left:260, behavior:'smooth' }));
  }

  function bindSearch(){
    els.search?.addEventListener('input', (event) => {
      state.query = event.target.value || '';
      renderGrid();
    });
  }

  function bindModal(){
    const toggle = (open) => {
      if (!els.modal) return;
      els.modal.classList.toggle('is-open', open);
      els.modal.setAttribute('aria-hidden', open ? 'false' : 'true');
    };
    els.openModal?.addEventListener('click', () => toggle(true));
    els.modal?.addEventListener('click', (event) => {
      if (event.target.closest('[data-close-modal="true"]')) toggle(false);
    });
    els.form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const sb = window.sb || window.supabaseClient || window.supabase || null;
      if (!sb?.from) {
        alert('Não foi possível criar a comunidade agora.');
        return;
      }
      const formData = new FormData(event.currentTarget);
      const payload = {
        nome: String(formData.get('nome') || '').trim(),
        descricao: String(formData.get('descricao') || '').trim(),
        tipo: String(formData.get('tipo') || 'Pro'),
        privacidade: String(formData.get('privacidade') || 'Público'),
        user_id: state.userId || null,
      };
      if (!payload.nome || !payload.descricao) return;
      const submit = event.currentTarget.querySelector('button[type="submit"]');
      const original = submit.textContent;
      submit.disabled = true;
      submit.textContent = 'Criando...';
      try {
        const { error } = await sb.from('comunidades').insert(payload);
        if (error) throw error;
        toggle(false);
        event.currentTarget.reset();
        await loadGroups();
      } catch (err) {
        console.error(err);
        alert('Não foi possível criar a comunidade agora.');
      } finally {
        submit.disabled = false;
        submit.textContent = original;
      }
    });
  }

  function bindRefresh(){
    els.refresh?.addEventListener('click', () => loadGroups());
  }

  bindFilters();
  bindSearch();
  bindModal();
  bindRefresh();
  loadGroups();
})();
