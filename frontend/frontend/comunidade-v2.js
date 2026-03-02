/* Doke - Comunidade V2 (upgrade)
   - Criação de grupos Público/Privado
   - Botão Entrar/Solicitar (privado -> pendente)
   - Render próprio da lista (sem depender do script.js)
   - Notificação best-effort para o dono (tabela notificações, se existir)

   Obs: Mantém compat com schemas diferentes (snake_case / camelCase).
*/

(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const GROUPS_TABLE = 'comunidades';
  const MEMBERS_TABLE = 'comunidade_membros';

  const listEl = $('#listaComunidades');
  const searchInput = $('#inputBuscaComm') || $('#buscaComm');

  function getClient(){
    return window.supabase || window.supabaseClient || window.sb || window.__supabaseClient || null;
  }

  const perfilLocal = (() => {
    try { return JSON.parse(localStorage.getItem('doke_usuario_perfil') || '{}') || {}; } catch(e){ return {}; }
  })();

  async function getUid(client){
    try{
      if (window.firebase && window.firebase.auth){
        const u = window.firebase.auth().currentUser;
        if (u?.uid) return u.uid;
      }
    }catch(_){ }
    try{
      if (client?.auth?.getUser){
        const { data } = await client.auth.getSession();
        if (data?.session?.user?.id) return data.session && data.session.user.id;
      }
    }catch(_){ }
    return (perfilLocal.uid || perfilLocal.id || perfilLocal.user_uid || perfilLocal.userId || perfilLocal.username || perfilLocal.user || '').toString().replace(/^@/,'');
  }

  function toast(msg){
    if (window.showToast) return window.showToast(msg);
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;right:18px;bottom:18px;background:#101828;color:#fff;padding:14px 16px;border-radius:14px;font-weight:800;z-index:99999;max-width:420px;box-shadow:0 18px 40px rgba(0,0,0,.25);';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(()=>t.remove(), 3200);
  }


  function normalizeUrl(u){
    if (!u) return '';
    u = String(u).trim();
    if (!u) return '';
    if (u.startsWith('data:')) return u;
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith('//')) return 'https:' + u;
    // caso o usuário tenha salvo domínio do Supabase sem protocolo
    if (u.includes('supabase.co') && !u.startsWith('http')){
      return 'https://' + u.replace(/^\/+/, '');
    }
    return u; // pode ser relativo (assets locais)
  }

  function safeBgUrl(u){
    u = normalizeUrl(u);
    if (!u) return '';
    return u.replace(/'/g, "\'");
  }

  async function hasColumn(client, table, col){
    try{
      const { error } = await client.from(table).select(col).limit(1);
      if (!error) return true;
      const msg = String(error.message || '').toLowerCase();
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
    }catch(_){ return false; }
  }

  async function pickColumn(client, table, candidates, fallback=null){
    for (const c of candidates){
      if (await hasColumn(client, table, c)) return c;
    }
    return fallback;
  }

  async function detectGroupsSchema(client){
    const nameCol = await pickColumn(client, GROUPS_TABLE, ['nome','titulo','name','title'], 'nome');
    const descCol = await pickColumn(client, GROUPS_TABLE, ['descricao','descrição','desc','sobre','bio','description'], 'descricao');
    const typeCol = await pickColumn(client, GROUPS_TABLE, ['tipo','category','categoria','tag'], 'tipo');
    const photoCol = await pickColumn(client, GROUPS_TABLE, ['foto','avatar','imagem','foto_url','avatar_url','image_url','url_foto'], null);
    const coverCol = await pickColumn(client, GROUPS_TABLE, ['capa','cover','cover_url','banner','banner_url'], null);
    const privateCol = await pickColumn(client, GROUPS_TABLE, ['privado','is_private','private','publico','publica'], 'privado');
    const ownerCol = await pickColumn(client, GROUPS_TABLE, ['dono_uid','donoUid','owner_uid','ownerUid','criado_por','criadoPor','created_by','createdBy','user_uid','userUid','autor_uid','autorUid'], null);
    return { nameCol, descCol, typeCol, photoCol, coverCol, privateCol, ownerCol };
  }

  async function detectMembersSchema(client){
    const communityCol = await pickColumn(client, MEMBERS_TABLE, ['comunidade_id','comunidadeId','community_id','communityId','grupo_id','grupoId'], 'comunidade_id');
    const userCol = await pickColumn(client, MEMBERS_TABLE, ['user_uid','userUid','user_id','userId','uid','usuario_id','autor_uid','autorUid'], 'user_uid');
    const statusCol = await pickColumn(client, MEMBERS_TABLE, ['status','situacao','estado'], null);
    const roleCol = await pickColumn(client, MEMBERS_TABLE, ['cargo','role','papel','tipo','nivel'], null);
    return { communityCol, userCol, statusCol, roleCol };
  }

  function normPrivate(group, schema){
    const v = group?.[schema.privateCol];
    if (typeof v === 'boolean') return v;
    const s = String(v || '').toLowerCase();
    if (schema.privateCol === 'publico' || schema.privateCol === 'publica'){
      // se a coluna for "publico", invertendo para manter semântica
      if (typeof v === 'boolean') return !v;
      if (s === 'true' || s === '1' || s === 'sim') return false;
      if (s === 'false' || s === '0' || s === 'nao' || s === 'não') return true;
    }
    return (s === 'true' || s === '1' || s === 'sim' || s.includes('priv'));
  }

  function makeCard(group, schema, myStatus, membersCount){
    const priv = normPrivate(group, schema);
    const id = (group.id ?? group.comunidade_id ?? group.grupo_id ?? group.community_id ?? group.comunidadeId ?? group.communityId);
    const nome = group?.[schema.nameCol] || 'Grupo';
    const desc = group?.[schema.descCol] || 'Sem descrição.';
    const tipo = group?.[schema.typeCol] || 'Geral';
    const fotoRaw = schema.photoCol ? (group?.[schema.photoCol] || '') : '';
    const capaRaw = schema.coverCol ? (group?.[schema.coverCol] || '') : '';
    const foto = normalizeUrl(fotoRaw);
    const capa = normalizeUrl(capaRaw);

    const el = document.createElement('div');
    el.className = 'com-card';
    el.setAttribute('data-tipo', String(tipo));

    el.innerHTML = `
      <div class="com-cover" style="background-image:url('${safeBgUrl(capa || foto || '')}')"></div>
      <div class="com-body">
        <div class="com-avatar">${foto ? `<img src="${foto}" alt="${nome}" onerror="this.remove();">` : `<i class='bx bx-group'></i>`}</div>
        <div class="com-info">
          <div class="com-title">${nome}</div>
          <div class="com-desc">${desc}</div>
          <div class="com-meta">
            <span class="pill">${tipo}</span>
            <span class="pill">${priv ? 'ðŸ”’ Privado' : 'ðŸŒ Público'}</span>
            <span class="meta-small">${membersCount} membro(s)</span>
          </div>
        </div>
        <button class="btn-ver-grupo" type="button"></button>
      </div>
    `;

    const btn = el.querySelector('.btn-ver-grupo');
    const go = () => (window.location.href = `grupo.html?id=${encodeURIComponent(id)}`);

    if (myStatus === 'ativo'){
      btn.textContent = 'Abrir';
      btn.addEventListener('click', (e)=>{ e.stopPropagation(); go(); });
      el.addEventListener('click', go);
      return el;
    }
    if (myStatus === 'pendente'){
      btn.textContent = 'Pendente';
      btn.disabled = true;
      btn.style.opacity = '0.75';
      btn.style.cursor = 'not-allowed';
      el.addEventListener('click', ()=>toast('Sua solicitação está pendente.'));
      return el;
    }

    btn.textContent = priv ? 'Solicitar' : 'Entrar';
    btn.addEventListener('click', async (e)=>{
      e.stopPropagation();
      btn.disabled = true;
      try{
        await joinOrRequest(id, priv, group?.[schema.ownerCol] || null);
        // se público, já entra e abre
        if (!priv) go();
      } finally {
        btn.disabled = false;
      }
    });

    el.addEventListener('click', ()=>toast(priv ? 'Grupo privado: solicite para entrar.' : 'Toque em Entrar para participar.'));
    return el;
  }

  async function tryNotify(client, toUid, payload){
    if (!toUid) return;
    // best-effort para alguns schemas comuns
    const table = 'notificacoes';
    try{
      const { error: probeErr } = await client.from(table).select('id').limit(1);
      const probeMsg = String(probeErr?.message || '').toLowerCase();
      if (probeErr && (probeMsg.includes('does not exist') || probeMsg.includes('could not find'))) return;
    }catch(_){ return; }

    const candidates = [
      // schema 1
      { userCol:'user_id', tipoCol:'tipo', tituloCol:'titulo', msgCol:'mensagem', linkCol:'link', fromCol:'remetente_uid', seenCol:'visto' },
      // schema 2
      { userCol:'para_uid', tipoCol:'tipo', tituloCol:'titulo', msgCol:'mensagem', linkCol:'url', fromCol:'de_uid', seenCol:'lida' },
      // schema 3
      { userCol:'uid', tipoCol:'type', tituloCol:'title', msgCol:'body', linkCol:'link', fromCol:'from_uid', seenCol:'seen' },
    ];

    for (const c of candidates){
      const row = {};
      row[c.userCol] = toUid;
      row[c.tipoCol] = payload.tipo || 'grupo';
      row[c.tituloCol] = payload.titulo || 'Notificação';
      row[c.msgCol] = payload.mensagem || '';
      if (payload.link) row[c.linkCol] = payload.link;
      if (payload.deUid && c.fromCol) row[c.fromCol] = payload.deUid;
      if (c.seenCol) row[c.seenCol] = false;
      try{
        const { error } = await client.from(table).insert(row);
        if (!error) return;
      }catch(_){ }
    }
  }

  async function joinOrRequest(groupId, isPrivate, ownerUid){
    const client = getClient();
    if (!client) return toast('Supabase não inicializado.');
    const uid = await getUid(client);
    if (!uid) return toast('Faça login para entrar.');

    const memSchema = await detectMembersSchema(client);
    // se não tiver statusCol, ainda dá para entrar, mas não dá para pendente
    if (isPrivate && !memSchema.statusCol){
      return toast('Para grupos privados, adicione uma coluna "status" em comunidade_membros (pendente/ativo).');
    }

    // verifica se já existe
    const { data: exists } = await client
      .from(MEMBERS_TABLE)
      .select('*')
      .eq(memSchema.communityCol, groupId)
      .eq(memSchema.userCol, uid)
      .limit(1);

    const base = {};
    base[memSchema.communityCol] = groupId;
    base[memSchema.userCol] = uid;
    if (memSchema.statusCol) base[memSchema.statusCol] = isPrivate ? 'pendente' : 'ativo';

    let err = null;
    if (exists && exists.length){
      const { error } = await client.from(MEMBERS_TABLE)
        .update(base)
        .eq('id', exists[0].id);
      err = error;
    } else {
      const { error } = await client.from(MEMBERS_TABLE).insert(base);
      err = error;
    }
    if (err){
      toast('Não consegui entrar/solicitar: ' + (err.message || 'erro'));
      return;
    }

    if (isPrivate){
      toast('Solicitação enviada âœ…');
      tryNotify(client, ownerUid, {
        tipo: 'grupo_solicitacao',
        titulo: 'Solicitação para entrar no grupo',
        mensagem: `Alguém solicitou entrada no seu grupo.`,
        link: `grupo.html?id=${encodeURIComponent(groupId)}`,
        deUid: uid
      });
    } else {
      toast('Entrou no grupo âœ…');
    }
  }

  async function computeMembersCount(client, memSchema, groupIds){
    if (!groupIds.length) return new Map();
    try{
      const { data, error } = await client
        .from(MEMBERS_TABLE)
        .select(`${memSchema.communityCol}${memSchema.statusCol ? ','+memSchema.statusCol : ''}`)
        .in(memSchema.communityCol, groupIds);
      if (error) throw error;
      const map = new Map();
      (data || []).forEach(r => {
        const gid = String(r[memSchema.communityCol] || '');
        if (!gid) return;
        // não conta pendente
        if (memSchema.statusCol){
          const st = String(r[memSchema.statusCol] || '').toLowerCase();
          if (st.includes('pend')) return;
        }
        map.set(gid, (map.get(gid) || 0) + 1);
      });
      return map;
    }catch(_){
      return new Map();
    }
  }

  async function load(){
    if (!listEl) return;
    const client = getClient();
    if (!client){
      listEl.innerHTML = '<div style="text-align:center; padding:40px; color:#888; grid-column:1/-1;">Supabase não inicializado.</div>';
      return;
    }
    const groupSchema = await detectGroupsSchema(client);
    const memSchema = await detectMembersSchema(client);
    const uid = await getUid(client);

    listEl.innerHTML = `
      <div style="text-align:center; padding:40px; color:#888; grid-column:1/-1;">
        <i class='bx bx-loader-alt bx-spin' style="font-size:2rem;"></i>
        <p>Buscando grupos...</p>
      </div>`;

    let { data: groups, error: gErr } = await client.from(GROUPS_TABLE).select('*').order('created_at', { ascending: false }).limit(200);
// compat: alguns schemas não têm created_at
if (gErr && (String(gErr.code||'') === '42703' || String(gErr.message||'').toLowerCase().includes('created_at'))){
  ({ data: groups, error: gErr } = await client.from(GROUPS_TABLE).select('*').limit(200));
}
    if (gErr){
      console.warn('[DOKE] comunidades load error', gErr);
      listEl.innerHTML = '<div style="text-align:center; padding:40px; color:#888; grid-column:1/-1;">Não foi possível carregar os grupos.</div>';
      return;
    }
    const rows = Array.isArray(groups) ? groups : [];
    if (!rows.length){
      listEl.innerHTML = '<div style="text-align:center; padding:40px; color:#888; grid-column:1/-1;">Nenhum grupo ainda. Crie o primeiro!</div>';
      return;
    }

    // status do usuário
    const statusMap = new Map();
    if (uid){
      try{
        const { data: mems } = await client.from(MEMBERS_TABLE).select('*').eq(memSchema.userCol, uid);
        (mems || []).forEach(m=>{
          const gid = String(m[memSchema.communityCol] || '');
          if (!gid) return;
          const st = memSchema.statusCol ? String(m[memSchema.statusCol]||'').toLowerCase() : 'ativo';
          statusMap.set(gid, st.includes('pend') ? 'pendente' : 'ativo');
        });
      }catch(_){ }
    }

    const ids = rows.map(r=>String(r.id)).filter(Boolean);
    const countMap = await computeMembersCount(client, memSchema, ids);

    listEl.innerHTML = '';
    rows.forEach(g=>{
      const gid = String(g.id);
      const my = statusMap.get(gid) || 'none';
      const card = makeCard(g, groupSchema, my === 'none' ? null : my, countMap.get(gid) || 0);
      listEl.appendChild(card);
    });

    // search input (se existir)
    if (searchInput && !searchInput._v2Bound){
      searchInput._v2Bound = true;
      searchInput.addEventListener('input', (e)=>{
        const t = String(e.target.value || '').toLowerCase().trim();
        $$('.com-card', listEl).forEach(c=>{
          const title = (c.querySelector('.com-title')?.textContent || '').toLowerCase();
          c.style.display = (!t || title.includes(t)) ? '' : 'none';
        });
      });
    }
  }

  async function createGroup(event){
    event?.preventDefault?.();
    const client = getClient();
    if (!client) return toast('Supabase não inicializado.');
    const uid = await getUid(client);
    if (!uid) return toast('Faça login para criar um grupo.');

    const schema = await detectGroupsSchema(client);
    const memSchema = await detectMembersSchema(client);

    const nome = ($('#commNome')?.value || '').trim();
    const desc = ($('#commDesc')?.value || '').trim();
    const tipo = ($('#commTipo')?.value || 'Pro').trim();
    const privSel = ($('#commPrivacidade')?.value || 'publico').toLowerCase();
    const privado = privSel === 'privado';

    if (!nome || !desc) return toast('Preencha nome e descrição.');

    const payload = {};
    payload[schema.nameCol] = nome;
    payload[schema.descCol] = desc;
    payload[schema.typeCol] = tipo;
    if (schema.ownerCol) payload[schema.ownerCol] = uid;
    // privado/publico
    if (schema.privateCol === 'publico' || schema.privateCol === 'publica') payload[schema.privateCol] = !privado;
    else payload[schema.privateCol] = privado;

    // cria
    const { data, error } = await client.from(GROUPS_TABLE).insert(payload).select('*').limit(1);
    if (error){
      console.warn('[DOKE] criar grupo error', error);
      return toast('Não consegui criar o grupo: ' + (error.message || 'erro'));
    }
    const created = Array.isArray(data) ? data[0] : data;
    const groupId = created?.id;

    // adiciona dono como membro ativo
    try{
      const m = {};
      m[memSchema.communityCol] = groupId;
      m[memSchema.userCol] = uid;
      if (memSchema.statusCol) m[memSchema.statusCol] = 'ativo';
      if (memSchema.roleCol) m[memSchema.roleCol] = 'dono';
      await client.from(MEMBERS_TABLE).insert(m);
    }catch(_){ }

    // upload (best-effort)
    try{
      const file = $('#commFoto')?.files?.[0];
      if (file && client.storage && schema.photoCol){
        const buckets = ['comunidades','comunidade','public','avatars'];
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `grupos/${groupId}/avatar.${ext}`;
        for (const b of buckets){
          try{
            const up = await client.storage.from(b).upload(path, file, { upsert: true });
            if (up?.error) throw up.error;
            const pub = client.storage.from(b).getPublicUrl(path);
            const url = pub?.data?.publicUrl;
            if (url){
              const upd = {}; upd[schema.photoCol] = url;
              await client.from(GROUPS_TABLE).update(upd).eq('id', groupId);
            }
            break;
          }catch(_){ /* tenta próximo bucket */ }
        }
      }
    }catch(_){ }

    try{ window.fecharModalCriarComm?.(); }catch(_){ }
    toast('Grupo criado âœ…');
    await load();
  }

  // Expor overrides para o HTML
  window.carregarComunidadesGerais = load;
  window.criarNovaComunidade = createGroup;

  // carregar automaticamente (se a página não chamar)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
})();

