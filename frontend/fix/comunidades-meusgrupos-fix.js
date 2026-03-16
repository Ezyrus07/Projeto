/* Doke - Patch Meus Grupos (comunidade.html)
   Corrige: "Faça login..." mesmo logado. Usa uid do Firebase, Supabase Auth ou localStorage.
   Renderiza #listaMeusGrupos a partir de comunidade_membros + comunidades.
*/
(function(){
  window.__DOKE_COMM_MY_GROUPS_PATCH__ = true;
  const $ = (sel, root=document) => root.querySelector(sel);

  const MEMBERS_TABLE = 'comunidade_membros';
  const GROUPS_TABLE  = 'comunidades';
  const MY_GROUPS_CACHE_KEY = 'doke_my_groups_cache_v5';
  let activeMyGroupsToken = 0;

  function getClient(){
    return window.supabase || window.supabaseClient || window.sb || window.__supabaseClient || null;
  }

  function readPerfilLocal(){
    try { return JSON.parse(localStorage.getItem('doke_usuario_perfil') || '{}') || {}; } catch(e){ return {}; }
  }

  async function getUid(client){
    // Firebase compat
    try{
      if (window.firebase && window.firebase.auth){
        const u = window.firebase.auth().currentUser;
        if (u && u.uid) return u.uid;
      }
    }catch(e){}
    // Supabase auth
    try{
      if (client?.auth?.getUser){
        const { data } = await client.auth.getSession();
        if (data?.session?.user?.id) return data.session && data.session.user.id;
      }
    }catch(e){}
    // local fallback
    const perfilLocal = readPerfilLocal();
    return (perfilLocal.uid || perfilLocal.id || perfilLocal.user_uid || perfilLocal.userId || localStorage.getItem('doke_uid') || perfilLocal.username || perfilLocal.user || '').toString().replace(/^@/,'');
  }

  async function hasColumn(client, table, col){
    try{
      const { error } = await client.from(table).select(col).limit(1);
      if (!error) return true;
      const msg = (error.message || '').toLowerCase();
      const code = String(error.code || '').toUpperCase();
      const status = Number(error.status || error.statusCode || 0);
      if (
        status >= 500 ||
        msg.includes('failed to fetch') ||
        msg.includes('network') ||
        msg.includes('cors') ||
        msg.includes('rest_backoff_active')
      ) return false;
      if (status === 401 || status === 403) return true;
      if (
        status === 400 || status === 404 ||
        code === '42703' || // undefined_column
        code === '42P01' || // undefined_table
        code === 'PGRST100' || // parse
        code === 'PGRST204' || // schema cache miss
        msg.includes('does not exist') ||
        msg.includes('could not find')
      ) return false;
      return true;
    }catch(e){ return false; }
  }

  async function detectMembersSchema(client){
    const communityColCandidates = ['comunidade_id','comunidadeId','community_id','communityId','grupo_id','grupoId'];
    const userColCandidates = ['user_uid','userUid','user_id','userId','uid','usuario_id','autor_uid','autorUid'];
    const statusColCandidates = ['status','situacao','estado'];

    const pick = async (cands) => {
      for (const c of cands){
        if (await hasColumn(client, MEMBERS_TABLE, c)) return c;
      }
      return null;
    };

    return {
      communityCol: await pick(communityColCandidates) || 'comunidade_id',
      userCol: await pick(userColCandidates) || 'user_uid',
      statusCol: await pick(statusColCandidates)
    };
  }

  async function detectGroupsSchema(client){
    const idCandidates = ['id','comunidade_id','uuid','grupo_id'];
    const nameCandidates = ['nome','titulo','name','title'];
    const photoCandidates = ['foto','avatar','imagem','foto_url','avatar_url','image_url'];

    const pick = async (cands) => {
      for (const c of cands){
        if (await hasColumn(client, GROUPS_TABLE, c)) return c;
      }
      return null;
    };

    return {
      idCol: await pick(idCandidates) || 'id',
      nameCol: await pick(nameCandidates) || 'nome',
      photoCol: await pick(photoCandidates)
    };
  }

  function updateJoinedGroupsStat(count){
    try{
      const stat = document.getElementById('heroJoinedGroups');
      if (stat) stat.textContent = String(Number(count || 0));
    }catch(_){ }
  }

  function hasVisibleMyGroups(el){
    return !!el && !!el.querySelector('.my-group-item');
  }

  function readCache(){
    try{
      const raw = sessionStorage.getItem(MY_GROUPS_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.groups)) return null;
      if (parsed.ts && (Date.now() - Number(parsed.ts) > 1000 * 60 * 45)) return null;
      return parsed.groups;
    }catch(_){ return null; }
  }

  function writeCache(groups){
    try{ sessionStorage.setItem(MY_GROUPS_CACHE_KEY, JSON.stringify({ ts: Date.now(), groups: Array.isArray(groups) ? groups : [] })); }catch(_){ }
  }

  function myGroupsSkeletonMarkup(count=4){
    return Array.from({ length: count }).map(() => `
      <div class="my-group-skeleton" aria-hidden="true">
        <div class="my-group-skeleton__thumb"></div>
        <div class="my-group-skeleton__line"></div>
      </div>`).join('');
  }

  function heroEmptyMarkup(title, message){
    return `
      <div class="comm-state" data-kind="empty">
        <div class="comm-state__icon"><i class='bx bx-group'></i></div>
        <div class="comm-state__body">
          <h3>${String(title || 'Nenhum grupo')}</h3>
          <p>${String(message || '')}</p>
        </div>
      </div>`;
  }

  function renderEmpty(el, msg){
    if (!el) return;
    const text = String(msg || '').trim();
    if (/^carregando/i.test(text)) {
      el.innerHTML = myGroupsSkeletonMarkup();
      return;
    }
    if (/nenhum grupo|não participa|nao participa/i.test(text)) {
      el.innerHTML = heroEmptyMarkup('Seus grupos aparecem aqui', 'Entre em um grupo para deixar atalhos rápidos nesta área.');
      updateJoinedGroupsStat(0);
      return;
    }
    if (/faça login|faca login/i.test(text)) {
      el.innerHTML = heroEmptyMarkup('Entre para ver seus grupos', 'Faça login para sincronizar os grupos que você já participa.');
      updateJoinedGroupsStat(0);
      return;
    }
    if (typeof window.dokeInlineStateMarkup === 'function') {
      el.innerHTML = window.dokeInlineStateMarkup(text);
      updateJoinedGroupsStat(0);
      return;
    }
    el.innerHTML = `<div style="color:rgba(255,255,255,0.75); padding:10px; font-weight:800;">${text}</div>`;
    updateJoinedGroupsStat(0);
  }

  function renderGroups(el, groups, schema){
    if (!el) return;
    if (!groups.length){
      renderEmpty(el, 'Você ainda não participa de nenhum grupo.');
      return;
    }
    el.innerHTML = '';
    groups.forEach(g=>{
      const a = document.createElement('div');
      a.className = 'my-group-item';
      const groupId = g.id || g[schema.idCol] || g.comunidade_id || g.uuid || g.grupo_id || '';
      a.addEventListener('click', ()=>{
        window.location.href = `grupo.html?id=${encodeURIComponent(groupId)}`;
      });

      const ring = document.createElement('div');
      ring.className = 'group-img-ring';

      const img = document.createElement('img');
      img.loading = 'lazy';
      const url = schema.photoCol ? (g[schema.photoCol] || '') : (g.foto || g.avatar || '');
      img.src = url || 'assets/Imagens/user_placeholder.png';
      ring.appendChild(img);

      const span = document.createElement('span');
      span.textContent = g[schema.nameCol] || g.nome || g.titulo || 'Grupo';

      a.appendChild(ring);
      a.appendChild(span);
      el.appendChild(a);
    });
    updateJoinedGroupsStat(groups.length);
    writeCache(groups);
  }

  function restoreFromCache(el){
    const groups = readCache();
    if (!el || !groups || !groups.length) return false;
    renderGroups(el, groups, { idCol: 'id', nameCol: 'nome', photoCol: 'foto' });
    return true;
  }

  async function run(options = {}){
    const token = ++activeMyGroupsToken;
    const { preserveVisible = false } = options || {};
    const el = $('#listaMeusGrupos');
    if (!el) return false;

    if (!preserveVisible && !hasVisibleMyGroups(el)) restoreFromCache(el);

    const client = getClient();
    if (!client){
      if (!hasVisibleMyGroups(el) && !restoreFromCache(el)) renderEmpty(el, 'Carregando seus grupos...');
      return false;
    }

    const uid = await getUid(client);
    if (!uid){
      renderEmpty(el, 'Faça login para ver seus grupos.');
      return false;
    }

    if (!preserveVisible && !hasVisibleMyGroups(el)) renderEmpty(el, 'Carregando seus grupos...');

    const memSchema = await detectMembersSchema(client);
    const grpSchema = await detectGroupsSchema(client);

    const q = client.from(MEMBERS_TABLE).select('*').eq(memSchema.userCol, uid);
    const { data: members, error: mErr } = await q;
    if (token !== activeMyGroupsToken) return false;

    if (mErr){
      console.warn('[DOKE] meus grupos membros error', mErr);
      renderEmpty(el, 'Não foi possível carregar seus grupos.');
      return false;
    }

    const rows = Array.isArray(members) ? members : [];
    let ids = rows.map(r=>r[memSchema.communityCol]).filter(Boolean);

    if (memSchema.statusCol){
      ids = rows
        .filter(r => String(r[memSchema.statusCol]||'').toLowerCase() !== 'pendente')
        .map(r=>r[memSchema.communityCol])
        .filter(Boolean);
    }

    ids = Array.from(new Set(ids.map(String)));
    if (!ids.length){
      try{
        const { data: directGroups } = await client.from(GROUPS_TABLE).select('*').limit(120);
        const directList = (Array.isArray(directGroups) ? directGroups : []).filter((g)=>{
          const membros = Array.isArray(g?.membros) ? g.membros.map(String) : [];
          return membros.includes(String(uid));
        });
        if (token !== activeMyGroupsToken) return false;
        renderGroups(el, directList, grpSchema);
        return true;
      }catch(_){
        renderGroups(el, [], grpSchema);
        return true;
      }
    }

    const groupIdCol = grpSchema.idCol || 'id';
    const { data: groups, error: gErr } = await client.from(GROUPS_TABLE).select('*').in(groupIdCol, ids);
    if (token !== activeMyGroupsToken) return false;
    if (gErr){
      console.warn('[DOKE] meus grupos grupos error', gErr);
      renderEmpty(el, 'Não foi possível carregar seus grupos.');
      return false;
    }

    renderGroups(el, Array.isArray(groups)?groups:[], grpSchema);
    return true;
  }

  async function boot(options){
    let ok = await run(options);
    if (ok) return;
    const delays = [180, 420, 900, 1600, 2600];
    for (const delay of delays){
      await new Promise((resolve) => setTimeout(resolve, delay));
      ok = await run(options);
      if (ok) return;
    }
  }

  window.carregarMeusGrupos = boot;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot({ preserveVisible:false }));
  else boot({ preserveVisible:false });
})();
