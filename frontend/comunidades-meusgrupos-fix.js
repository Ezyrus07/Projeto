/* Doke - Patch Meus Grupos (comunidade.html)
   Corrige: "Faça login..." mesmo logado. Usa uid do Firebase, Supabase Auth ou localStorage.
   Renderiza #listaMeusGrupos a partir de comunidade_membros + comunidades.
*/
(function(){
  const $ = (sel, root=document) => root.querySelector(sel);

  const MEMBERS_TABLE = 'comunidade_membros';
  const GROUPS_TABLE  = 'comunidades';

  function getClient(){
    return window.supabase || window.supabaseClient || null;
  }

  const perfilLocal = (() => {
    try { return JSON.parse(localStorage.getItem('doke_usuario_perfil') || '{}') || {}; } catch(e){ return {}; }
  })();

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
    return (perfilLocal.uid || perfilLocal.id || perfilLocal.user_uid || perfilLocal.userId || perfilLocal.username || perfilLocal.user || '').toString().replace(/^@/,'');
  }

  async function hasColumn(client, table, col){
    try{
      const { error } = await client.from(table).select(col).limit(1);
      if (!error) return true;
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('does not exist') || msg.includes('could not find')) return false;
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
    const nameCandidates = ['nome','titulo','name','title'];
    const photoCandidates = ['foto','avatar','imagem','foto_url','avatar_url','image_url'];

    const pick = async (cands) => {
      for (const c of cands){
        if (await hasColumn(client, GROUPS_TABLE, c)) return c;
      }
      return null;
    };

    return {
      nameCol: await pick(nameCandidates) || 'nome',
      photoCol: await pick(photoCandidates)
    };
  }

  function renderEmpty(el, msg){
    if (!el) return;
    el.innerHTML = `<div style="color:rgba(255,255,255,0.75); padding:10px; font-weight:800;">${msg}</div>`;
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
      a.addEventListener('click', ()=>{
        // abre grupo.html
        window.location.href = `grupo.html?id=${encodeURIComponent(g.id)}`;
      });

      const ring = document.createElement('div');
      ring.className = 'group-img-ring';

      const img = document.createElement('img');
      img.loading = 'lazy';
      const url = schema.photoCol ? (g[schema.photoCol] || '') : (g.foto || g.avatar || '');
      img.src = url || 'https://images.unsplash.com/photo-1520975693410-001f7d8d60cf?auto=format&fit=crop&w=240&q=60';
      ring.appendChild(img);

      const span = document.createElement('span');
      span.textContent = g[schema.nameCol] || 'Grupo';

      a.appendChild(ring);
      a.appendChild(span);
      el.appendChild(a);
    });
  }

  async function run(){
    const el = $('#listaMeusGrupos');
    if (!el) return;

    const client = getClient();
    if (!client){
      renderEmpty(el, 'Supabase não inicializado.');
      return;
    }

    const uid = await getUid(client);
    if (!uid){
      renderEmpty(el, 'Faça login para ver seus grupos.');
      return;
    }

    renderEmpty(el, 'Carregando seus grupos...');

    const memSchema = await detectMembersSchema(client);
    const grpSchema = await detectGroupsSchema(client);

    const q = client.from(MEMBERS_TABLE).select('*').eq(memSchema.userCol, uid);
    const { data: members, error: mErr } = await q;

    if (mErr){
      console.warn('[DOKE] meus grupos membros error', mErr);
      renderEmpty(el, 'Não foi possível carregar seus grupos.');
      return;
    }

    const rows = Array.isArray(members) ? members : [];
    let ids = rows.map(r=>r[memSchema.communityCol]).filter(Boolean);

    // filtra pendente se tiver status
    if (memSchema.statusCol){
      ids = rows
        .filter(r => String(r[memSchema.statusCol]||'').toLowerCase() !== 'pendente')
        .map(r=>r[memSchema.communityCol])
        .filter(Boolean);
    }

    // unique
    ids = Array.from(new Set(ids.map(String)));
    if (!ids.length){
      renderGroups(el, [], grpSchema);
      return;
    }

    const { data: groups, error: gErr } = await client.from(GROUPS_TABLE).select('*').in('id', ids);
    if (gErr){
      console.warn('[DOKE] meus grupos grupos error', gErr);
      renderEmpty(el, 'Não foi possível carregar seus grupos.');
      return;
    }

    renderGroups(el, Array.isArray(groups)?groups:[], grpSchema);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

