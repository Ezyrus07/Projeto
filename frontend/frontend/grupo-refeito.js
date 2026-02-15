/* Doke - Grupo Refeito (isolado)
   Corrige: gating de membro (entrar/solicitar), enviar, reagir, responder, excluir
   Sem depender do script principal. */

(function(){
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const POSTS_TABLE = 'comunidade_posts';
  const MEMBERS_TABLE = 'comunidade_membros';
  const GROUPS_TABLE = 'comunidades';
  const REACTIONS_TABLE = 'comunidade_post_reacoes';
  const CARGOS_TABLE = 'comunidade_cargos';
  const MUTES_TABLE = 'comunidade_mutes';

  // UI
  const feedEl = $('#grupoFeed');
  const emptyEl = $('#feedEmpty');
  const inputEl = $('#postTexto');
  const fileEl = $('#postArquivo');
  const sendBtn = $('#btnEnviarPost');
  const joinGate = $('#joinGate');
  const joinTitle = $('#joinGateTitle');
  const joinSub = $('#joinGateSub');
  const joinBtn = $('#btnJoinGate');
  const replyBar = $('#replyBar');
  const replyTitle = $('#replyBarTitle');
  const replyPreview = $('#replyBarPreview');
  const replyClose = $('#btnCloseReply');

// Admin: solicitações (grupos privados)
const requestsPane = $('#requestsPane');
const requestsSub = $('#requestsSub');
const requestsList = $('#listaSolicitacoes');
const btnRefreshReq = $('#btnRefreshSolicitacoes');

// Membros
const membrosSub = $('#membrosSub');
const listaOnline = $('#listaOnline');
const listaOffline = $('#listaOffline');
const countOnline = $('#countOnline');
const countOffline = $('#countOffline');
const grupoMembrosCount = $('#grupoMembrosCount');

// Grupo header
const grupoCover = $('#grupoCover');
const grupoAvatar = $('#grupoAvatar');
const grupoNome = $('#grupoNome');
const grupoDesc = $('#grupoDesc');
const grupoTipo = $('#grupoTipo');

// Config modal
const btnConfigGrupo = $('#btnConfigGrupo');
const modalGrupoConfig = $('#modalGrupoConfig');
const btnFecharConfig = $('#btnFecharConfig');
const tabCfgEditar = $('#tabCfgEditar');
const tabCfgCargos = $('#tabCfgCargos');
const tabCfgSilenciados = $('#tabCfgSilenciados');
const cfgEditar = $('#cfgEditar');
const cfgCargos = $('#cfgCargos');
const cfgSilenciados = $('#cfgSilenciados');

const cfgNome = $('#cfgNome');
const cfgDesc = $('#cfgDesc');
const btnSalvarGrupo = $('#btnSalvarGrupo');

const cargoNome = $('#cargoNome');
const cargoCor = $('#cargoCor');
const btnCriarCargo = $('#btnCriarCargo');
const listaCargos = $('#listaCargos');

const btnTrocarFotoGrupo = $('#btnTrocarFotoGrupo');
const btnTrocarCapaGrupo = $('#btnTrocarCapaGrupo');
const inputFotoGrupo = $('#inputFotoGrupo');
const inputCapaGrupo = $('#inputCapaGrupo');
const previewFotoGrupo = $('#previewFotoGrupo');
const previewCapaGrupo = $('#previewCapaGrupo');

const listaSilenciados = $('#listaSilenciados');
const btnRefreshSilenciados = $('#btnRefreshSilenciados');

let isAdmin = false;
let groupData = null;
let ownerUid = null;
let cargosCache = [];
let mutesCache = new Set();
let memberDisplaySchema = null;
let groupSchema = null;

  let client = null;
  let grupoId = null;

  // profile from localStorage (modo 3)
  const perfilLocal = (() => {
    try { return JSON.parse(localStorage.getItem('doke_usuario_perfil') || '{}') || {}; } catch(e){ return {}; }
  })();
  const userName = (perfilLocal.nome || perfilLocal.name || 'Você');
  const userFoto = (perfilLocal.foto || perfilLocal.photo || 'https://i.pravatar.cc/150');
  const userHandleRaw = (perfilLocal.user || perfilLocal.username || (userName.split(' ')[0] || 'user')).toString().replace(/^@/,'');
  const userHandle = '@' + userHandleRaw;

  // Auth UID: try Firebase auth compat first, then Supabase auth, then localStorage
  async function getUid(){
    // Firebase compat
    try {
      if (window.firebase && window.firebase.auth) {
        const u = window.firebase.auth().currentUser;
        if (u && u.uid) return u.uid;
      }
    } catch(e){}
    // Supabase auth
    try{
      if (client?.auth?.getUser) {
        const { data } = await client.auth.getSession();
        if (data?.session?.user?.id) return data.session && data.session.user.id;
      }
    }catch(e){}
    // Local fallback
    return (perfilLocal.uid || perfilLocal.id || perfilLocal.user_uid || perfilLocal.userId || userHandleRaw);
  }

  function toast(msg){
    // reuse existing toast if present
    if (window.showToast) return window.showToast(msg);
    let t = document.createElement('div');
    t.style.cssText = 'position:fixed;right:18px;bottom:18px;background:#101828;color:#fff;padding:14px 16px;border-radius:14px;font-weight:800;z-index:99999;max-width:420px;box-shadow:0 18px 40px rgba(0,0,0,.25);';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(()=>t.remove(), 3500);
  }

  // ------ schema detection helpers (avoid breaking on camelCase/snake_case) ------
  async function hasColumn(table, col){
    const { error } = await client.from(table).select(col).limit(1);
    if (!error) return true;
    if ((error.message || '').toLowerCase().includes('does not exist')) return false;
    // Some 400s are "column not found"
    if ((error.message || '').toLowerCase().includes('could not find')) return false;
    // If error is RLS/permission, column may still exist.
    return true;
  }

  async function detectMembersSchema(){
    const communityColCandidates = ['comunidade_id','comunidadeId'];
    const userColCandidates = ['user_uid','userUid','user_id','userId','uid','autorUid'];
    const statusColCandidates = ['status','situacao','estado'];
    let communityCol = null, userCol = null, statusCol = null;

    for (const c of communityColCandidates){ if (await hasColumn(MEMBERS_TABLE, c)){ communityCol = c; break; } }
    for (const c of userColCandidates){ if (await hasColumn(MEMBERS_TABLE, c)){ userCol = c; break; } }
    for (const c of statusColCandidates){ if (await hasColumn(MEMBERS_TABLE, c)){ statusCol = c; break; } }

    // fallback
    if (!communityCol) communityCol = 'comunidade_id';
    if (!userCol) userCol = 'user_uid';

    return { communityCol, userCol, statusCol };
  }

  async function detectPostsSchema(){
    const communityColCandidates = ['comunidadeId','comunidade_id'];
    const textColCandidates = ['texto','mensagem','conteudo'];
    const authorUidCandidates = ['autorUid','autor_uid','user_uid','userUid','user_id','userId','uid'];
    const authorUserCandidates = ['autorUser','autor_user','user','username'];
    const authorFotoCandidates = ['autorFoto','autor_foto','foto','photo','avatar'];
    const createdCandidates = ['created_at','criado_em','data','timestamp'];

    let communityCol=null, textCol=null, authorUidCol=null, authorUserCol=null, authorFotoCol=null, createdCol=null;

    for (const c of communityColCandidates){ if (await hasColumn(POSTS_TABLE, c)){ communityCol=c; break; } }
    for (const c of textColCandidates){ if (await hasColumn(POSTS_TABLE, c)){ textCol=c; break; } }
    for (const c of authorUidCandidates){ if (await hasColumn(POSTS_TABLE, c)){ authorUidCol=c; break; } }
    for (const c of authorUserCandidates){ if (await hasColumn(POSTS_TABLE, c)){ authorUserCol=c; break; } }
    for (const c of authorFotoCandidates){ if (await hasColumn(POSTS_TABLE, c)){ authorFotoCol=c; break; } }
    for (const c of createdCandidates){ if (await hasColumn(POSTS_TABLE, c)){ createdCol=c; break; } }

    return {
      communityCol: communityCol || 'comunidadeId',
      textCol: textCol || 'texto',
      authorUidCol: authorUidCol || 'autorUid',
      authorUserCol: authorUserCol || 'autorUser',
      authorFotoCol: authorFotoCol || 'autorFoto',
      createdCol: createdCol || 'created_at'
    };
  }

  async function tableExists(table){
    const { error } = await client.from(table).select('*').limit(1);
    if (!error) return true;
    const m = (error.message||'').toLowerCase();
    if (m.includes('does not exist') || m.includes('could not find')) return false;
    return true; // permission etc
  }

  // ------ group privacy ------
  async function isGroupPrivate(){
    // default public
    try{
      const { data, error } = await client.from(GROUPS_TABLE).select('*').eq('id', grupoId).maybeSingle();
      if (error || !data) return false;
      // try common flags
      if (typeof data.privado === 'boolean') return data.privado;
      if (typeof data.is_private === 'boolean') return data.is_private;
      if (typeof data.publico === 'boolean') return !data.publico;
      if (typeof data.tipo === 'string') return data.tipo.toLowerCase().includes('priv');
      return false;
    }catch(e){ return false; }
  }


async function detectAdmin(){
  try{
    const { data, error } = await client.from(GROUPS_TABLE).select('*').eq('id', grupoId).maybeSingle();
    if (error || !data) return false;

    const uid = String(currentUid);

    // candidatos comuns
    const candidates = [
      data.donoUid, data.dono_uid, data.owner_uid, data.ownerUid,
      data.criado_por, data.criadoPor, data.created_by, data.createdBy,
      data.user_uid, data.userUid, data.autorUid, data.autor_uid
    ].filter(Boolean).map(v => String(v));

    if (candidates.includes(uid)) return true;

    // se tiver "nivel_admin" ou algo parecido
    if (typeof data.admins === 'object' && Array.isArray(data.admins)){
      if (data.admins.map(String).includes(uid)) return true;
    }

    return false;
  }catch(e){
    return false;
  }
}

function shortUid(u){
  const s = String(u||'');
  if (s.length <= 10) return s;
  return s.slice(0,6) + 'â€¦' + s.slice(-4);
}

async function loadJoinRequests(){
  if (!requestsPane || !requestsList) return;

  const privateGroup = await isGroupPrivate();
  if (!privateGroup){
    requestsPane.style.display='none';
    return;
  }

  if (!isAdmin){
    requestsPane.style.display='none';
    return;
  }

  // precisa de coluna de status
  if (!memberSchema.statusCol){
    requestsPane.style.display='block';
    requestsSub.textContent = 'Coluna de status não encontrada na tabela de membros.';
    requestsList.innerHTML = '<div style="padding:12px; color:#7a8797; font-weight:800;">Para aprovar solicitações, adicione uma coluna <b>status</b> (ex: pendente/ativo) na tabela <b>comunidade_membros</b>.</div>';
    return;
  }

  requestsPane.style.display='block';
  requestsSub.textContent = 'Carregandoâ€¦';
  requestsList.innerHTML = '<div style="padding:12px; color:#7a8797; font-weight:800;">Buscando solicitações pendentesâ€¦</div>';

  const { communityCol, userCol, statusCol } = memberSchema;

  // tenta pegar colunas úteis se existirem
  const possibleNameCols = ['user','username','autorUser','autor_user','nome','name','handle'];
  const possibleFotoCols = ['foto','photo','avatar','autorFoto','autor_foto'];

  try{
    const { data, error } = await client
      .from(MEMBERS_TABLE)
      .select('*')
      .eq(communityCol, grupoId)
      .ilike(statusCol, '%pend%');

    if (error){
      console.error('[REQ] select error', error);
      requestsSub.textContent = 'Não foi possível listar (RLS/perm).';
      requestsList.innerHTML = '<div style="padding:12px; color:#7a8797; font-weight:800;">Sem permissão para listar solicitações.</div>';
      return;
    }

    const rows = (data || []);
    requestsSub.textContent = rows.length ? `${rows.length} pendente(s)` : 'Nenhuma pendente';
    if (!rows.length){
      requestsList.innerHTML = '<div style="padding:12px; color:#7a8797; font-weight:800;">Nenhuma solicitação pendente no momento.</div>';
      return;
    }

    const html = rows.map(r=>{
      const uid = r[userCol] || r.uid || r.user_uid || r.userId || '';
      let nome = '';
      for (const c of possibleNameCols){ if (r[c]) { nome = String(r[c]); break; } }
      nome = nome ? (nome.startsWith('@') ? nome : '@'+nome.replace(/^@/,'') ) : ('Usuário ' + shortUid(uid));

      let foto = '';
      for (const c of possibleFotoCols){ if (r[c]) { foto = String(r[c]); break; } }

      const avatar = foto ? `<img src="${foto}" alt="">` : `<span>${(nome.replace('@','')[0]||'U').toUpperCase()}</span>`;

      const rowId = r.id || r.uuid || r._id || '';
      // fallback: composite key (uid+grupo) for actions if no id
      const key = rowId ? `id:${rowId}` : `ck:${uid}`;

      return `
        <div class="req-item" data-req-key="${key}">
          <div class="req-avatar">${avatar}</div>
          <div class="req-info">
            <div class="req-user">${escapeHtml(nome)}</div>
            <div class="req-sub">Solicitou entrar</div>
          </div>
          <div class="req-actions">
            <button class="btn-req approve" data-action="approve">Aprovar</button>
            <button class="btn-req reject" data-action="reject">Recusar</button>
          </div>
        </div>
      `;
    }).join('');

    requestsList.innerHTML = html;
    wireRequestActions(rows);
  }catch(e){
    console.error('[REQ] exception', e);
    requestsSub.textContent = 'Erro';
    requestsList.innerHTML = '<div style="padding:12px; color:#7a8797; font-weight:800;">Erro ao buscar solicitações.</div>';
  }
}

function wireRequestActions(rows){
  const { communityCol, userCol, statusCol } = memberSchema;

  const mapByKey = new Map();
  rows.forEach(r=>{
    const uid = r[userCol] || r.uid || r.user_uid || '';
    const rowId = r.id || r.uuid || r._id || '';
    const key = rowId ? `id:${rowId}` : `ck:${uid}`;
    mapByKey.set(key, r);
  });

  $$('.req-item', requestsList).forEach(el=>{
    const key = el.dataset.reqKey;
    const approveBtn = el.querySelector('[data-action="approve"]');
    const rejectBtn = el.querySelector('[data-action="reject"]');

    async function setLoading(on){
      approveBtn.disabled = on;
      rejectBtn.disabled = on;
    }

    approveBtn?.addEventListener('click', async ()=>{
      const r = mapByKey.get(key);
      if (!r) return;
      await setLoading(true);
      try{
        // update status to ativo
        const upd = {};
        upd[statusCol] = 'ativo';

        let q = client.from(MEMBERS_TABLE).update(upd);

        if (r.id) q = q.eq('id', r.id);
        else {
          const uid = r[userCol] || r.uid || r.user_uid;
          q = q.eq(communityCol, grupoId).eq(userCol, uid);
        }

        const { error } = await q;
        if (error){
          console.error('[REQ] approve error', error);
          toast('Não consegui aprovar: ' + (error.message||''));
          return;
        }
        toast('Aprovado âœ…');
        el.remove();
        // refresh counter
        btnRefreshReq?.click();
      } finally {
        await setLoading(false);
      }
    });

    rejectBtn?.addEventListener('click', async ()=>{
      const r = mapByKey.get(key);
      if (!r) return;
      await setLoading(true);
      try{
        let q = client.from(MEMBERS_TABLE).delete();
        if (r.id) q = q.eq('id', r.id);
        else {
          const uid = r[userCol] || r.uid || r.user_uid;
          q = q.eq(communityCol, grupoId).eq(userCol, uid);
        }
        const { error } = await q;
        if (error){
          console.error('[REQ] reject error', error);
          toast('Não consegui recusar: ' + (error.message||''));
          return;
        }
        toast('Recusado.');
        el.remove();
        btnRefreshReq?.click();
      } finally {
        await setLoading(false);
      }
    });
  });
}

  // ------ membership gating ------
  let memberSchema=null;
  let postsSchema=null;
  let currentUid=null;
  let membership = { ok:false, pending:false, row:null };

  function setComposerEnabled(enabled){
    inputEl.disabled = !enabled;
    sendBtn.disabled = !enabled;
    fileEl.disabled = !enabled;
    const ph = enabled ? 'Digite uma mensagem para o grupo...' : 'Entre no grupo para postar...';
    inputEl.placeholder = ph;
    if (!enabled) {
      // cancel reply if user can't post
      setReply(null);
    }
  }

  function setReply(obj){
    if (!obj){
      replyBar.style.display='none';
      replyBar.dataset.replyId='';
      replyTitle.textContent='Respondendo';
      replyPreview.textContent='';
      return;
    }
    replyBar.style.display='flex';
    replyBar.dataset.replyId = obj.id;
    replyTitle.textContent = `Respondendo ${obj.user || '@usuario'}`;
    replyPreview.textContent = obj.preview || '';
  }

  async function checkMembership(){
    membership = { ok:false, pending:false, row:null };
    const { communityCol, userCol, statusCol } = memberSchema;
    const uid = currentUid;

    const { data, error } = await client
      .from(MEMBERS_TABLE)
      .select('*')
      .eq(communityCol, grupoId)
      .eq(userCol, uid)
      .limit(1);

    if (error){
      console.warn('[MEMBERS] select error', error);
      // if cannot select due to RLS, we can't confirm membership -> assume not member
      return membership;
    }
    const row = (data && data[0]) || null;
    if (!row) return membership;

    membership.row = row;
    membership.ok = true;
    if (statusCol && row[statusCol]){
      const st = String(row[statusCol]).toLowerCase();
      if (st.includes('pend') || st.includes('await') || st.includes('solicit')) membership.pending = true;
    }
    return membership;
  }

  async function requestJoin(){
    joinBtn.disabled = true;
    try{
      const privateGroup = await isGroupPrivate();
      const payloadBase = {};
      payloadBase[memberSchema.communityCol] = grupoId;
      payloadBase[memberSchema.userCol] = currentUid;

      // only set status if column exists
      if (memberSchema.statusCol){
        payloadBase[memberSchema.statusCol] = privateGroup ? 'pendente' : 'ativo';
      }

      // try insert
      const { error } = await client.from(MEMBERS_TABLE).insert(payloadBase);

      if (error){
        console.error('[JOIN] insert failed', error);
        // show real reason
        toast('Não consegui entrar/solicitar. Detalhe: ' + (error.message || 'erro'));
        joinBtn.disabled = false;
        return;
      }

      toast(privateGroup ? 'Solicitação enviada âœ…' : 'Entrou no grupo âœ…');
      await refreshGate();
    } finally {
      joinBtn.disabled = false;
    }
  }

  async function refreshGate(){
    await checkMembership();

    if (membership.ok && !membership.pending){
      joinGate.style.display='none';
      setComposerEnabled(true);
      return;
    }

    // not member or pending
    setComposerEnabled(false);
    joinGate.style.display='block';

    const privateGroup = await isGroupPrivate();
    if (membership.ok && membership.pending){
      joinTitle.textContent = 'Aguardando aprovação';
      joinSub.textContent = 'Sua solicitação está pendente.';
      joinBtn.textContent = 'Solicitação enviada';
      joinBtn.disabled = true;
      return;
    }

    joinTitle.textContent = privateGroup ? 'Solicitar permissão' : 'Entre no grupo';
    joinSub.textContent = privateGroup ? 'Toque para solicitar entrada e aguarde aprovação.' : 'Toque para entrar e começar a postar.';
    joinBtn.textContent = privateGroup ? 'Solicitar permissão' : 'Entrar no grupo';
    joinBtn.disabled = false;
  }

  // ------ posts ------
  function fmtTime(ts){
    try{
      const d = ts ? new Date(ts) : new Date();
      const hh = String(d.getHours()).padStart(2,'0');
      const mm = String(d.getMinutes()).padStart(2,'0');
      return `${hh}:${mm}`;
    }catch(e){ return ''; }
  }

  function postToHtml(p){
    const avatar = (p[postsSchema.authorFotoCol] || p.autorFoto || p.autor_foto || p.foto || 'https://i.pravatar.cc/150');
    const user = (p[postsSchema.authorUserCol] || p.autorUser || p.autor_user || p.user || p.username || 'usuario').toString().replace(/^@/,'');
    const handle = '@' + user;
    const time = fmtTime(p[postsSchema.createdCol] || p.created_at || p.data);

    const text = p[postsSchema.textCol] || p.texto || p.mensagem || '';
    const replyToId = p.reply_to_id || p.replyToId || '';
    const replyToUser = p.reply_to_user || p.replyToUser || '';
    const replyPreviewTxt = p.reply_preview || p.replyPreview || '';

    let mediaHtml = '';
    const url = p.midia_url || p.media_url || p.arquivo_url || p.url || '';
    const tipo = (p.tipo || p.media_type || '').toString();
    if (url){
      if (tipo.includes('image') || /\.(png|jpg|jpeg|webp|gif)$/i.test(url)){
        mediaHtml = `<div class="media"><img src="${url}" alt=""></div>`;
      } else if (tipo.includes('audio') || /\.(mp3|wav|ogg|m4a)$/i.test(url)){
        mediaHtml = `<div class="media"><audio controls style="width:100%"><source src="${url}"></audio></div>`;
      } else {
        mediaHtml = `<div class="media"><a class="tab-btn active" href="${url}" target="_blank" rel="noreferrer">Abrir arquivo</a></div>`;
      }
    }

    const canAct = membership.ok && !membership.pending;
    const canDelete = (String(p[postsSchema.authorUidCol] || p.autorUid || '') === String(currentUid));

    const quoteHtml = replyToId ? `
      <div class="quote">
        <div class="q-user">${replyToUser ? ('Respondendo '+replyToUser) : 'Respondendo'}</div>
        <div class="q-text">${replyPreviewTxt || ''}</div>
      </div>` : '';

    return `
      <div class="msg" data-post-id="${p.id}">
        <img class="avatar" src="${avatar}" alt="">
        <div class="body">
          <div class="meta">
            <div class="user">${handle}</div>
            <div class="time">${time}</div>
          </div>
          ${quoteHtml}
          ${text ? `<div class="text">${escapeHtml(text)}</div>` : ``}
          ${mediaHtml}
          <div class="actions">
            <button class="btn-act btn-reply" ${canAct ? '' : 'disabled'} title="Responder">â†©ï¸ <span>Responder</span></button>
            <button class="btn-act btn-react" ${canAct ? '' : 'disabled'} title="Reagir">ðŸ‘ <span>Reagir</span></button>
            <button class="btn-act btn-del" ${canDelete && canAct ? '' : 'disabled'} title="Excluir">ðŸ—‘ï¸ <span>Excluir</span></button>
          </div>
          <div class="reacts" style="display:none;"></div>
        </div>
      </div>
    `;
  }

  function escapeHtml(str){
    return String(str)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'","&#039;");
  }

  async function loadPosts(limit=40){
    const { communityCol, createdCol } = postsSchema;
    const { data, error } = await client
      .from(POSTS_TABLE)
      .select('*')
      .eq(communityCol, grupoId)
      .order(createdCol, { ascending: true })
      .limit(limit);

    if (error){
      console.error('[POSTS] load error', error);
      toast('Erro ao carregar feed: ' + (error.message || ''));
      return;
    }

    feedEl.innerHTML = '';
    if (!data || data.length===0){
      emptyEl.style.display='block';
      return;
    }
    emptyEl.style.display='none';
    feedEl.insertAdjacentHTML('beforeend', data.map(postToHtml).join(''));
    wirePostActions();
    await hydrateReactionsForVisible();
  }

  function wirePostActions(){
    $$('.msg', feedEl).forEach(msgEl=>{
      const postId = msgEl.dataset.postId;
      const btnReply = $('.btn-reply', msgEl);
      const btnReact = $('.btn-react', msgEl);
      const btnDel = $('.btn-del', msgEl);

      btnReply?.addEventListener('click', ()=>{
        const user = $('.user', msgEl)?.textContent || '@usuario';
        const preview = $('.text', msgEl)?.textContent || '';
        setReply({ id: postId, user, preview });
        inputEl.focus();
      });

      btnReact?.addEventListener('click', async ()=>{
        await toggleReaction(postId, 'ðŸ‘');
        await hydrateReactionsForPost(postId);
      });

      btnDel?.addEventListener('click', async ()=>{
        if (!confirm('Excluir esta mensagem?')) return;
        const { error } = await client.from(POSTS_TABLE).delete().eq('id', postId);
        if (error) return toast('Não consegui excluir: ' + (error.message||''));
        msgEl.remove();
      });
    });
  }

  // ------ reactions (table first, then fallback silent) ------
  let reactionsEnabled = false;
  let reactSchema = null;

  async function detectReactionsSchema(){
    reactionsEnabled = await tableExists(REACTIONS_TABLE);
    if (!reactionsEnabled) return null;

    const postIdCandidates = ['post_id','postId','postid'];
    const userCandidates = ['user_uid','userUid','user_id','userId','uid'];
    const emojiCandidates = ['emoji','reacao','reaction'];

    let postIdCol=null, userCol=null, emojiCol=null;
    for (const c of postIdCandidates){ if (await hasColumn(REACTIONS_TABLE, c)){ postIdCol=c; break; } }
    for (const c of userCandidates){ if (await hasColumn(REACTIONS_TABLE, c)){ userCol=c; break; } }
    for (const c of emojiCandidates){ if (await hasColumn(REACTIONS_TABLE, c)){ emojiCol=c; break; } }

    return { postIdCol: postIdCol||'post_id', userCol: userCol||'user_uid', emojiCol: emojiCol||'emoji' };
  }


  // ------ group schema + header + membros + cargos + mutes ------

  async function detectGroupSchema(){
    // columns may vary; we detect common ones
    const nameCandidates = ['nome','titulo','name','title'];
    const descCandidates = ['descricao','descrição','description','desc'];
    const typeCandidates = ['tipo','type'];
    const avatarCandidates = ['foto','avatar','imagem','foto_url','avatar_url','image_url'];
    const coverCandidates = ['capa','cover','banner','capa_url','cover_url','banner_url'];
    const privateCandidates = ['privado','is_private','publico','publica'];

    const ownerCandidates = ['donoUid','dono_uid','owner_uid','ownerUid','criado_por','criadoPor','created_by','createdBy','user_uid','userUid','autorUid','autor_uid'];

    const pick = async (cands) => {
      for (const c of cands){
        try{
          if (await hasColumn(GROUPS_TABLE, c)) return c;
        }catch(e){}
      }
      return null;
    };

    return {
      nameCol: await pick(nameCandidates) || 'nome',
      descCol: await pick(descCandidates) || 'descricao',
      typeCol: await pick(typeCandidates) || 'tipo',
      avatarCol: await pick(avatarCandidates),
      coverCol: await pick(coverCandidates),
      privateCol: await pick(privateCandidates),
      ownerCol: await pick(ownerCandidates)
    };
  }

  async function detectMemberDisplaySchema(){
    const nameCandidates = ['nome','user','username','autorUser','autor_user','handle','apelido'];
    const fotoCandidates = ['foto','avatar','photo','foto_url','avatar_url','photo_url'];
    const roleCandidates = ['cargo','cargo_nome','cargoName','role','nivel','cargo_id','cargoId'];

    const pick = async (cands) => {
      for (const c of cands){
        try{ if (await hasColumn(MEMBERS_TABLE, c)) return c; }catch(e){}
      }
      return null;
    };

    return {
      nameCol: await pick(nameCandidates),
      fotoCol: await pick(fotoCandidates),
      roleCol: await pick(roleCandidates)
    };
  }

  function setPreviewBox(el, url, mode){
    if (!el) return;
    el.innerHTML = '';
    if (!url){
      el.innerHTML = '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#7a8696; font-weight:900;">Sem imagem</div>';
      return;
    }
    const img = document.createElement('img');
    img.src = url;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = mode || 'cover';
    el.appendChild(img);
  }

  function renderGroupHeader(){
    if (!groupData) return;

    const name = groupData[groupSchema.nameCol] || 'Grupo';
    const desc = groupData[groupSchema.descCol] || '';
    const tipo = groupData[groupSchema.typeCol] || (groupData.privado ? 'Privado' : 'Público');

    if (grupoNome) grupoNome.textContent = name;
    if (grupoDesc) grupoDesc.textContent = desc;
    if (grupoTipo) grupoTipo.textContent = tipo;

    // cover
    const coverUrl = groupSchema.coverCol ? groupData[groupSchema.coverCol] : (groupData.capa || groupData.cover || '');
    if (grupoCover){
      if (coverUrl){
        grupoCover.style.backgroundImage = `url('${coverUrl}')`;
        grupoCover.style.backgroundSize = 'cover';
        grupoCover.style.backgroundPosition = 'center';
      } else {
        grupoCover.style.backgroundImage = '';
      }
    }

    // avatar
    const avatarUrl = groupSchema.avatarCol ? groupData[groupSchema.avatarCol] : (groupData.foto || groupData.avatar || '');
    if (grupoAvatar){
      grupoAvatar.innerHTML = '';
      if (avatarUrl){
        const img = document.createElement('img');
        img.src = avatarUrl;
        img.alt = name;
        img.style.width='100%';
        img.style.height='100%';
        img.style.objectFit='cover';
        img.style.borderRadius='18px';
        grupoAvatar.appendChild(img);
      }else{
        const initial = document.createElement('div');
        initial.className='initial';
        initial.textContent = (name || 'G').trim().slice(0,1).toUpperCase();
        grupoAvatar.appendChild(initial);
      }
    }

    // previews in config modal
    setPreviewBox(previewFotoGrupo, avatarUrl, 'cover');
    setPreviewBox(previewCapaGrupo, coverUrl, 'cover');
  }

  async function loadGroup(){
    groupSchema = groupSchema || await detectGroupSchema();
    const { data, error } = await client.from(GROUPS_TABLE).select('*').eq('id', grupoId).maybeSingle();
    if (error || !data){
      console.warn('[DOKE] loadGroup error', error);
      return;
    }
    groupData = data;
    ownerUid = groupSchema.ownerCol ? String(groupData[groupSchema.ownerCol] || '') : null;
    renderGroupHeader();
  }

  function makeMemberRow(member, isMuted){
    const uid = String(member[memberSchema.userCol] ?? member.user_uid ?? member.user_id ?? '');
    const name = (memberDisplaySchema?.nameCol ? member[memberDisplaySchema.nameCol] : null) || member.nome || member.user || uid;
    const foto = (memberDisplaySchema?.fotoCol ? member[memberDisplaySchema.fotoCol] : null) || member.foto || '';

    const item = document.createElement('div');
    item.className = 'membro-item';
    item.style.position = 'relative';

    const left = document.createElement('div');
    left.className = 'membro-left';

    const avatar = document.createElement('div');
    avatar.className = 'membro-avatar';
    if (foto){
      const img = document.createElement('img');
      img.src = foto;
      img.alt = name;
      avatar.appendChild(img);
    }else{
      avatar.textContent = (String(name).trim().slice(0,1) || 'U').toUpperCase();
    }

    const info = document.createElement('div');
    info.className = 'membro-info';
    info.style.minWidth='0';

    const nm = document.createElement('div');
    nm.className = 'membro-name';
    nm.style.fontWeight='900';
    nm.style.color='#1d2b3a';
    nm.style.whiteSpace='nowrap';
    nm.style.overflow='hidden';
    nm.style.textOverflow='ellipsis';
    nm.textContent = name;

    const sub = document.createElement('div');
    sub.className = 'membro-handle';
    sub.style.fontWeight='800';
    sub.style.color='#7a8696';
    sub.style.fontSize='0.85rem';
    sub.textContent = uid === String(currentUid) ? 'Você' : shortUid(uid);

    info.appendChild(nm);
    info.appendChild(sub);
    left.appendChild(avatar);
    left.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'membro-actions';

    const badge = document.createElement('div');
    badge.className = 'membro-badge';
    // show role
    let roleText = 'Membro';
    let roleLower = '';
    try{
      if (ownerUid && uid === ownerUid) { roleText='Dono'; badge.classList.add('dono'); }
      else{
        const roleCol = memberDisplaySchema?.roleCol;
        if (roleCol && member[roleCol]!=null && String(member[roleCol]).trim()!==''){
          roleText = String(member[roleCol]);
        }
      }
      roleLower = String(roleText).toLowerCase();
      if (roleLower.includes('dono')) badge.classList.add('dono');
    }catch(e){}
    if (isMuted){
      badge.classList.add('mute');
      roleText = roleText + ' Â· Silenciado';
    }
    badge.textContent = roleText;

    actions.appendChild(badge);

    if (isAdmin && uid !== String(currentUid)){
      const menuBtn = document.createElement('button');
      menuBtn.className = 'membro-menu-btn';
      menuBtn.innerHTML = '<i class="bx bx-dots-vertical-rounded"></i>';

      const menu = document.createElement('div');
      menu.className = 'membro-menu';
      menu.style.display='none';

      const btnCargo = document.createElement('button');
      btnCargo.textContent = 'Atribuir cargo';
      btnCargo.addEventListener('click', async ()=>{
        menu.style.display='none';
        await openAssignCargo(uid, name);
      });

      const btnMute = document.createElement('button');
      btnMute.textContent = isMuted ? 'Remover silêncio' : 'Silenciar';
      btnMute.addEventListener('click', async ()=>{
        menu.style.display='none';
        if (isMuted) await unmuteMember(uid);
        else await muteMember(uid);
        await loadMutes();
        await loadMembers();
      });

      const btnKick = document.createElement('button');
      btnKick.textContent = 'Expulsar do grupo';
      btnKick.addEventListener('click', async ()=>{
        menu.style.display='none';
        if (!confirm('Expulsar este membro do grupo?')) return;
        await kickMember(uid);
        await loadMembers();
      });

      menu.appendChild(btnCargo);
      menu.appendChild(btnMute);
      menu.appendChild(btnKick);

      menuBtn.addEventListener('click', ()=>{
        // close others
        document.querySelectorAll('.membro-menu').forEach(el=>{ if (el!==menu) el.style.display='none'; });
        menu.style.display = (menu.style.display==='none') ? 'block' : 'none';
      });

      document.addEventListener('click', (ev)=>{
        if (!item.contains(ev.target)) menu.style.display='none';
      });

      actions.appendChild(menuBtn);
      item.appendChild(menu);
    }

    item.appendChild(left);
    item.appendChild(actions);
    return item;
  }

  async function loadMembers(){
    if (!listaOnline || !listaOffline) return;

    memberDisplaySchema = memberDisplaySchema || await detectMemberDisplaySchema();
    await loadMutes(); // update mutesCache

    const { communityCol, userCol, statusCol } = memberSchema;
    const q = client.from(MEMBERS_TABLE).select('*').eq(communityCol, grupoId);

    const { data, error } = await q;
    if (error){
      console.warn('[DOKE] loadMembers error', error);
      listaOnline.innerHTML = '<div style="padding:10px; color:#7a8696; font-weight:800;">Não foi possível carregar membros.</div>';
      listaOffline.innerHTML = '';
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    // if status col exists, exclude pendente from visible list for non-admin
    let visible = rows;
    if (statusCol && !isAdmin){
      visible = rows.filter(r => String(r[statusCol]||'').toLowerCase() !== 'pendente');
    }

    // determine online: use col 'online' or last_seen within 5min; else treat all online
    const hasOnline = await hasColumn(MEMBERS_TABLE, 'online').catch(()=>false);
    const hasLastSeen = await hasColumn(MEMBERS_TABLE, 'last_seen').catch(()=>false);

    const now = Date.now();
    const online=[], offline=[];
    for (const r of visible){
      const uid = String(r[userCol] ?? '');
      const muted = mutesCache.has(uid);
      let isOn = true;
      if (hasOnline && typeof r.online === 'boolean') isOn = r.online;
      else if (hasLastSeen && r.last_seen){
        const t = new Date(r.last_seen).getTime();
        isOn = isFinite(t) && (now - t) < 5*60*1000;
      }
      (isOn ? online : offline).push({ r, muted });
    }

    if (countOnline) countOnline.textContent = String(online.length);
    if (countOffline) countOffline.textContent = String(offline.length);
    if (membrosSub) membrosSub.textContent = String(visible.length) + ' no total';
    if (grupoMembrosCount) grupoMembrosCount.textContent = visible.length + ' membros';

    listaOnline.innerHTML = '';
    listaOffline.innerHTML = '';
    online.forEach(({r, muted})=> listaOnline.appendChild(makeMemberRow(r, muted)));
    offline.forEach(({r, muted})=> listaOffline.appendChild(makeMemberRow(r, muted)));
  }

  // ------ cargos ------
  async function loadCargos(){
    if (!listaCargos) return;
    const commCol = (await hasColumn(CARGOS_TABLE, 'comunidade_id')) ? 'comunidade_id' : (await hasColumn(CARGOS_TABLE,'comunidadeId')?'comunidadeId':'comunidade_id');
    const { data, error } = await client.from(CARGOS_TABLE).select('*').eq(commCol, grupoId).order('nivel', { ascending: false });
    if (error){
      console.warn('[DOKE] loadCargos error', error);
      listaCargos.innerHTML = '<div style="padding:10px; color:#7a8696; font-weight:800;">Não foi possível carregar cargos.</div>';
      cargosCache=[];
      return;
    }
    cargosCache = Array.isArray(data)?data:[];
    renderCargos();
  }

  function renderCargos(){
    if (!listaCargos) return;
    if (!cargosCache.length){
      listaCargos.innerHTML = '<div style="padding:10px; color:#7a8696; font-weight:800;">Nenhum cargo criado.</div>';
      return;
    }
    listaCargos.innerHTML = '';
    cargosCache.forEach(c=>{
      const row = document.createElement('div');
      row.style.display='flex';
      row.style.alignItems='center';
      row.style.justifyContent='space-between';
      row.style.gap='10px';
      row.style.padding='10px 12px';
      row.style.border='1px solid #eef0f4';
      row.style.borderRadius='14px';
      const left = document.createElement('div');
      left.style.display='flex';
      left.style.alignItems='center';
      left.style.gap='10px';
      const dot = document.createElement('div');
      dot.style.width='12px'; dot.style.height='12px'; dot.style.borderRadius='6px';
      dot.style.background = c.cor || '#2a5f90';
      const nm = document.createElement('div');
      nm.style.fontWeight='900';
      nm.style.color='#1d2b3a';
      nm.textContent = c.nome || c.name || 'Cargo';
      const lvl = document.createElement('div');
      lvl.style.fontWeight='900';
      lvl.style.color='#7a8696';
      lvl.style.fontSize='0.85rem';
      lvl.textContent = (c.nivel!=null) ? ('Nível ' + c.nivel) : '';
      left.appendChild(dot); left.appendChild(nm); left.appendChild(lvl);

      const right = document.createElement('div');
      right.style.display='flex'; right.style.gap='8px'; right.style.alignItems='center';

      if (isAdmin){
        const del = document.createElement('button');
        del.className='tab-btn';
        del.type='button';
        del.textContent='Excluir';
        del.addEventListener('click', async ()=>{
          if (!confirm('Excluir este cargo?')) return;
          await deleteCargo(c);
          await loadCargos();
        });
        right.appendChild(del);
      }

      row.appendChild(left);
      row.appendChild(right);
      listaCargos.appendChild(row);
    });
  }

  async function createCargo(){
    if (!cargoNome) return;
    const nome = (cargoNome.value||'').trim();
    if (!nome){ toast('Digite um nome de cargo.'); return; }
    const cor = (cargoCor?.value||'').trim() || '#2a5f90';
    const commCol = (await hasColumn(CARGOS_TABLE, 'comunidade_id')) ? 'comunidade_id' : (await hasColumn(CARGOS_TABLE,'comunidadeId')?'comunidadeId':'comunidade_id');
    const payload = {};
    payload[commCol] = grupoId;
    payload['nome'] = nome;
    if (await hasColumn(CARGOS_TABLE,'cor')) payload['cor'] = cor;
    if (await hasColumn(CARGOS_TABLE,'nivel')) payload['nivel'] = 1;
    if (await hasColumn(CARGOS_TABLE,'criado_por')) payload['criado_por'] = String(currentUid);
    if (await hasColumn(CARGOS_TABLE,'criado_em')) payload['criado_em'] = new Date().toISOString();

    const { error } = await client.from(CARGOS_TABLE).insert(payload);
    if (error){
      console.warn('[DOKE] createCargo error', error);
      toast('Não foi possível criar o cargo.');
      return;
    }
    cargoNome.value='';
    if (cargoCor) cargoCor.value='';
    await loadCargos();
    toast('Cargo criado.');
  }

  async function deleteCargo(c){
    const idCol = (await hasColumn(CARGOS_TABLE,'id')) ? 'id' : null;
    let q = client.from(CARGOS_TABLE).delete();
    if (idCol && c[idCol]!=null) q = q.eq(idCol, c[idCol]);
    else q = q.eq('nome', c.nome);
    const { error } = await q;
    if (error) console.warn('[DOKE] deleteCargo error', error);
  }

  // ------ assign cargo to member ------
  async function openAssignCargo(targetUid, targetName){
    await loadCargos();
    if (!cargosCache.length){
      toast('Crie um cargo primeiro (aba Cargos).');
      return;
    }
    // modal simple
    const overlay = document.createElement('div');
    overlay.style.position='fixed';
    overlay.style.inset='0';
    overlay.style.background='rgba(0,0,0,.35)';
    overlay.style.zIndex='99999';
    overlay.style.display='flex';
    overlay.style.alignItems='center';
    overlay.style.justifyContent='center';
    const card = document.createElement('div');
    card.style.background='#fff';
    card.style.borderRadius='16px';
    card.style.padding='14px';
    card.style.width='min(520px, 92vw)';
    card.style.boxShadow='0 24px 60px rgba(0,0,0,.25)';
    card.innerHTML = `<div style="font-weight:900; color:#1d2b3a; font-size:1.1rem; margin-bottom:4px;">Atribuir cargo</div>
      <div style="color:#667085; font-weight:800; margin-bottom:12px;">Para: <b>${escapeHtml(targetName || targetUid)}</b></div>`;
    const sel = document.createElement('select');
    sel.className='form-input';
    sel.style.width='100%';
    sel.style.margin='0 0 12px 0';
    cargosCache.forEach(c=>{
      const opt=document.createElement('option');
      opt.value = (c.id!=null)?String(c.id):String(c.nome||'');
      opt.textContent = (c.nome||'Cargo') + (c.nivel!=null?` (nível ${c.nivel})`:'');
      sel.appendChild(opt);
    });
    const row = document.createElement('div');
    row.style.display='flex'; row.style.gap='10px'; row.style.justifyContent='flex-end';
    const btnCancel=document.createElement('button');
    btnCancel.className='tab-btn'; btnCancel.type='button'; btnCancel.textContent='Cancelar';
    const btnOk=document.createElement('button');
    btnOk.className='btn-submit-modal'; btnOk.type='button'; btnOk.textContent='Aplicar';
    row.appendChild(btnCancel); row.appendChild(btnOk);
    card.appendChild(sel); card.appendChild(row);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    btnCancel.onclick=()=>overlay.remove();
    overlay.addEventListener('click',(e)=>{ if(e.target===overlay) overlay.remove(); });

    btnOk.onclick=async ()=>{
      btnOk.disabled=true;
      try{
        const val = sel.value;
        const cargo = cargosCache.find(c=>String((c.id!=null)?c.id:c.nome)===String(val)) || cargosCache[0];
        await assignCargoToMember(targetUid, cargo);
        toast('Cargo aplicado.');
        overlay.remove();
        await loadMembers();
      }catch(e){
        console.warn('[DOKE] assign cargo error', e);
        toast('Não foi possível atribuir cargo.');
      }finally{
        btnOk.disabled=false;
      }
    };
  }

  async function assignCargoToMember(targetUid, cargo){
    // find role column in membros table
    const roleCols = ['cargo_id','cargoId','cargo','cargo_nome','cargoName','role','nivel'];
    let roleCol = null;
    for (const c of roleCols){
      if (await hasColumn(MEMBERS_TABLE, c)){ roleCol=c; break; }
    }
    if (!roleCol){
      toast('Sua tabela comunidade_membros não tem coluna de cargo. Adicione uma coluna "cargo" ou "cargo_id".');
      return;
    }

    const { communityCol, userCol } = memberSchema;
    const patch = {};
    if (roleCol.toLowerCase().includes('id')) patch[roleCol] = cargo.id ?? null;
    else if (roleCol === 'nivel') patch[roleCol] = cargo.nivel ?? 1;
    else patch[roleCol] = cargo.nome || cargo.name || 'Membro';

    const { error } = await client.from(MEMBERS_TABLE).update(patch).eq(communityCol, grupoId).eq(userCol, targetUid);
    if (error) throw error;
  }

  // ------ mutes ------
  async function detectMutesSchema(){
    const communityColCandidates = ['comunidade_id','comunidadeId','community_id','communityId','grupo_id','grupoId'];
    const userColCandidates = ['user_uid','userUid','user_id','userId','uid','usuario_id','autor_uid','autorUid'];
    const byCandidates = ['criado_por','muted_by','mutedBy','autor_uid','autorUid'];
    const atCandidates = ['criado_em','created_at','createdAt','muted_at','mutedAt'];

    const pick = async (cands) => {
      for (const c of cands){
        try{ if (await hasColumn(MUTES_TABLE, c)) return c; }catch(e){}
      }
      return null;
    };

    return {
      communityCol: await pick(communityColCandidates) || 'comunidade_id',
      userCol: await pick(userColCandidates) || 'user_uid',
      byCol: await pick(byCandidates),
      atCol: await pick(atCandidates)
    };
  }

  let mutesSchema = null;

  async function loadMutes(){
    if (!client) return;
    mutesSchema = mutesSchema || await detectMutesSchema();
    const { communityCol, userCol } = mutesSchema;
    const { data, error } = await client.from(MUTES_TABLE).select('*').eq(communityCol, grupoId);
    if (error){
      console.warn('[DOKE] loadMutes error', error);
      mutesCache = new Set();
      return;
    }
    const set = new Set();
    (Array.isArray(data)?data:[]).forEach(r=>{
      const uid = String(r[userCol] ?? '');
      if (uid) set.add(uid);
    });
    mutesCache = set;
    renderSilenciados(data || []);
  }

  async function muteMember(targetUid){
    mutesSchema = mutesSchema || await detectMutesSchema();
    const { communityCol, userCol, byCol, atCol } = mutesSchema;
    const payload = {};
    payload[communityCol] = grupoId;
    payload[userCol] = String(targetUid);
    if (byCol) payload[byCol] = String(currentUid);
    if (atCol) payload[atCol] = new Date().toISOString();

    // try upsert
    try{
      const { error } = await client.from(MUTES_TABLE).upsert(payload, { onConflict: `${communityCol},${userCol}` });
      if (error) throw error;
    }catch(e){
      const { error } = await client.from(MUTES_TABLE).insert(payload);
      if (error) console.warn('[DOKE] mute insert error', error);
    }
    toast('Usuário silenciado.');
  }

  async function unmuteMember(targetUid){
    mutesSchema = mutesSchema || await detectMutesSchema();
    const { communityCol, userCol } = mutesSchema;
    const { error } = await client.from(MUTES_TABLE).delete().eq(communityCol, grupoId).eq(userCol, String(targetUid));
    if (error) console.warn('[DOKE] unmute error', error);
    toast('Silêncio removido.');
  }

  function renderSilenciados(rows){
    if (!listaSilenciados) return;
    const data = Array.isArray(rows)?rows:[];
    if (!data.length){
      listaSilenciados.innerHTML = '<div style="padding:10px; color:#7a8696; font-weight:800;">Nenhum usuário silenciado.</div>';
      return;
    }
    listaSilenciados.innerHTML = '';
    data.forEach(r=>{
      const uid = String(r[mutesSchema.userCol] ?? '');
      const row = document.createElement('div');
      row.style.display='flex';
      row.style.alignItems='center';
      row.style.justifyContent='space-between';
      row.style.gap='10px';
      row.style.padding='10px 12px';
      row.style.border='1px solid #eef0f4';
      row.style.borderRadius='14px';
      const left = document.createElement('div');
      left.style.fontWeight='900';
      left.style.color='#1d2b3a';
      left.textContent = shortUid(uid);
      const right = document.createElement('div');
      if (isAdmin){
        const btn = document.createElement('button');
        btn.className='tab-btn';
        btn.type='button';
        btn.textContent='Remover';
        btn.onclick = async ()=>{ await unmuteMember(uid); await loadMutes(); await loadMembers(); };
        right.appendChild(btn);
      }
      row.appendChild(left);
      row.appendChild(right);
      listaSilenciados.appendChild(row);
    });
  }

  async function isCurrentUserMuted(){
    if (!String(currentUid)) return false;
    await loadMutes();
    return mutesCache.has(String(currentUid));
  }

  // ------ kick ------
  async function kickMember(targetUid){
    const { communityCol, userCol } = memberSchema;
    const { error } = await client.from(MEMBERS_TABLE).delete().eq(communityCol, grupoId).eq(userCol, String(targetUid));
    if (error){
      console.warn('[DOKE] kick error', error);
      toast('Não foi possível expulsar.');
      return;
    }
    // remove mute if any
    try{ await unmuteMember(targetUid); }catch(e){}
    toast('Membro removido.');
  }

  // ------ avatar/cover update ------
  async function uploadGroupImage(file, kind){
    if (!file) return '';
    const bucket = 'comunidades_posts'; // reusing existing bucket
    const safeName = String(file.name||'img').replaceAll(' ','_');
    const path = `grupos/${grupoId}/meta/${kind}_${Date.now()}_${safeName}`;
    const { error } = await client.storage.from(bucket).upload(path, file, { upsert:true });
    if (error) throw error;
    const { data } = client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async function updateGroupField(url, kind){
    groupSchema = groupSchema || await detectGroupSchema();
    // choose field candidates
    const avatarCands = ['foto','avatar','imagem','foto_url','avatar_url','image_url'];
    const coverCands = ['capa','cover','banner','capa_url','cover_url','banner_url'];
    const candidates = (kind==='avatar') ? avatarCands : coverCands;
    let col = null;
    for (const c of candidates){
      if (await hasColumn(GROUPS_TABLE, c)){ col=c; break; }
    }
    if (!col){
      toast('A tabela comunidades não tem coluna para ' + (kind==='avatar'?'foto':'capa') + '. Adicione uma coluna (ex: foto/capa).');
      return;
    }
    const patch = {};
    patch[col] = url;
    const { error } = await client.from(GROUPS_TABLE).update(patch).eq('id', grupoId);
    if (error){
      console.warn('[DOKE] updateGroupField error', error);
      toast('Não foi possível atualizar.');
      return;
    }
    // update local data
    groupData = groupData || {};
    groupData[col] = url;
    renderGroupHeader();
    toast((kind==='avatar'?'Foto':'Capa') + ' atualizada.');
  }

  function wireConfigModal(){
    if (!btnConfigGrupo || !modalGrupoConfig) return;

    const open = ()=>{
      modalGrupoConfig.setAttribute('aria-hidden','false');
      modalGrupoConfig.style.display='flex';
      // default tab
      showCfgTab('editar');
      // fill inputs
      if (cfgNome && groupSchema?.nameCol) cfgNome.value = groupData?.[groupSchema.nameCol] || '';
      if (cfgDesc && groupSchema?.descCol) cfgDesc.value = groupData?.[groupSchema.descCol] || '';
      loadCargos();
      loadMutes();
    };
    const close = ()=>{
      modalGrupoConfig.setAttribute('aria-hidden','true');
      modalGrupoConfig.style.display='none';
    };

    btnConfigGrupo.addEventListener('click', open);
    btnFecharConfig?.addEventListener('click', close);
    modalGrupoConfig.addEventListener('click', (e)=>{ if (e.target===modalGrupoConfig) close(); });

    tabCfgEditar?.addEventListener('click', ()=>showCfgTab('editar'));
    tabCfgCargos?.addEventListener('click', ()=>showCfgTab('cargos'));
    tabCfgSilenciados?.addEventListener('click', ()=>showCfgTab('silenciados'));

    btnCriarCargo?.addEventListener('click', createCargo);
    btnRefreshSilenciados?.addEventListener('click', loadMutes);

    btnTrocarFotoGrupo?.addEventListener('click', ()=>inputFotoGrupo?.click());
    btnTrocarCapaGrupo?.addEventListener('click', ()=>inputCapaGrupo?.click());

    inputFotoGrupo?.addEventListener('change', async ()=>{
      const file = inputFotoGrupo.files && inputFotoGrupo.files[0];
      if (!file) return;
      try{
        const url = await uploadGroupImage(file, 'avatar');
        await updateGroupField(url, 'avatar');
      }catch(e){
        console.warn('[DOKE] upload avatar error', e);
        toast('Falha ao enviar foto.');
      }finally{
        inputFotoGrupo.value='';
      }
    });

    inputCapaGrupo?.addEventListener('change', async ()=>{
      const file = inputCapaGrupo.files && inputCapaGrupo.files[0];
      if (!file) return;
      try{
        const url = await uploadGroupImage(file, 'cover');
        await updateGroupField(url, 'cover');
      }catch(e){
        console.warn('[DOKE] upload cover error', e);
        toast('Falha ao enviar capa.');
      }finally{
        inputCapaGrupo.value='';
      }
    });

    btnSalvarGrupo?.addEventListener('click', async ()=>{
      if (!isAdmin){ toast('Sem permissão.'); return; }
      groupSchema = groupSchema || await detectGroupSchema();
      const patch = {};
      if (groupSchema.nameCol && cfgNome) patch[groupSchema.nameCol] = cfgNome.value.trim();
      if (groupSchema.descCol && cfgDesc) patch[groupSchema.descCol] = cfgDesc.value.trim();
      const { error } = await client.from(GROUPS_TABLE).update(patch).eq('id', grupoId);
      if (error){
        console.warn('[DOKE] save group error', error);
        toast('Não foi possível salvar.');
        return;
      }
      Object.assign(groupData, patch);
      renderGroupHeader();
      toast('Grupo atualizado.');
    });
  }

  function showCfgTab(which){
    const setActive = (btn, on)=>{ if(!btn) return; btn.classList.toggle('active', !!on); };
    if (cfgEditar) cfgEditar.style.display = (which==='editar') ? 'block' : 'none';
    if (cfgCargos) cfgCargos.style.display = (which==='cargos') ? 'block' : 'none';
    if (cfgSilenciados) cfgSilenciados.style.display = (which==='silenciados') ? 'block' : 'none';

    setActive(tabCfgEditar, which==='editar');
    setActive(tabCfgCargos, which==='cargos');
    setActive(tabCfgSilenciados, which==='silenciados');
  }

  function escapeHtml(s){
    return String(s||'').replace(/[&<>"]/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]||c));
  }

  async function toggleReaction(postId, emoji){
    if (!reactionsEnabled) return;
    const { postIdCol, userCol, emojiCol } = reactSchema;

    // check if exists
    const { data, error } = await client.from(REACTIONS_TABLE)
      .select('id')
      .eq(postIdCol, postId)
      .eq(userCol, currentUid)
      .eq(emojiCol, emoji)
      .limit(1);

    if (error){
      console.warn('[REACT] select error', error);
      return;
    }
    if (data && data[0]){
      const { error: delErr } = await client.from(REACTIONS_TABLE).delete().eq('id', data[0].id);
      if (delErr) toast('Não consegui remover reação.');
      return;
    }
    const payload = {};
    payload[postIdCol]=postId; payload[userCol]=currentUid; payload[emojiCol]=emoji;
    const { error: insErr } = await client.from(REACTIONS_TABLE).insert(payload);
    if (insErr) toast('Não consegui reagir.');
  }

  async function hydrateReactionsForVisible(){
    if (!reactionsEnabled) return;
    const ids = $$('.msg', feedEl).map(el=>el.dataset.postId).filter(Boolean);
    if (!ids.length) return;
    const { postIdCol, emojiCol, userCol } = reactSchema;

    const { data, error } = await client.from(REACTIONS_TABLE)
      .select(`${postIdCol},${emojiCol},${userCol}`)
      .in(postIdCol, ids)
      .limit(5000);

    if (error){
      console.warn('[REACT] hydrate error', error);
      return;
    }
    const byPost = {};
    (data||[]).forEach(r=>{
      const pid = r[postIdCol];
      byPost[pid] = byPost[pid] || [];
      byPost[pid].push(r);
    });
    ids.forEach(pid=>{
      renderReactions(pid, byPost[pid] || []);
    });
  }

  async function hydrateReactionsForPost(postId){
    if (!reactionsEnabled) return;
    const { postIdCol, emojiCol, userCol } = reactSchema;
    const { data, error } = await client.from(REACTIONS_TABLE)
      .select(`${postIdCol},${emojiCol},${userCol}`)
      .eq(postIdCol, postId)
      .limit(2000);
    if (error) return;
    renderReactions(postId, data||[]);
  }

  function renderReactions(postId, reactions){
    const msgEl = $(`.msg[data-post-id="${postId}"]`, feedEl);
    if (!msgEl) return;
    const box = $('.reacts', msgEl);
    if (!box) return;

    const counts = {};
    reactions.forEach(r=>{
      const e = r[reactSchema.emojiCol];
      counts[e] = (counts[e]||0)+1;
    });

    const chips = Object.keys(counts).map(e=>{
      const mine = reactions.some(r=>String(r[reactSchema.userCol])===String(currentUid) && r[reactSchema.emojiCol]===e);
      return `<button class="react-chip ${mine?'active':''}" data-emoji="${e}">${e} ${counts[e]}</button>`;
    });

    box.style.display = chips.length ? 'flex' : 'none';
    box.innerHTML = chips.join('');

    $$('.react-chip', box).forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        await toggleReaction(postId, btn.dataset.emoji);
        await hydrateReactionsForPost(postId);
      });
    });
  }

  // ------ send ------
  async function uploadFile(file){
    // Supabase storage bucket: comunidades_posts
    const bucket = 'comunidades_posts';
    const path = `grupos/${grupoId}/${currentUid}/${Date.now()}_${file.name}`.replaceAll(' ','_');
    const { error } = await client.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async function sendMessage(){
    if (!membership.ok || membership.pending){
      toast('Entre no grupo para postar.');
      return;

    // muted?
    try{
      if (await isCurrentUserMuted()){
        toast('Você está silenciado neste grupo.');
        return;
      }
    }catch(e){}
    }
    const text = (inputEl.value || '').trim();
    const file = fileEl.files && fileEl.files[0];

    if (!text && !file) return;

    sendBtn.disabled = true;
    try{
      let url = '';
      let tipo = 'texto';
      if (file){
        url = await uploadFile(file);
        tipo = file.type.startsWith('image/') ? 'imagem'
             : file.type.startsWith('audio/') ? 'audio'
             : file.type.startsWith('video/') ? 'video' : 'arquivo';
      }

      const payload = {};
      payload[postsSchema.communityCol] = grupoId;
      payload[postsSchema.textCol] = text || null;
      payload[postsSchema.authorUidCol] = currentUid;

      // store only user handle and photo (no full name)
      payload[postsSchema.authorUserCol] = userHandleRaw;
      payload[postsSchema.authorFotoCol] = userFoto;

      if (url){
        // try common media columns
        payload['midia_url'] = url;
        payload['tipo'] = tipo;
      }

      // reply
      const rid = replyBar.dataset.replyId || '';
      if (rid){
        payload['reply_to_id'] = rid;
        payload['reply_to_user'] = replyTitle.textContent.replace('Respondendo ','').trim();
        payload['reply_preview'] = replyPreview.textContent || '';
      }

      const { error } = await client.from(POSTS_TABLE).insert(payload);
      if (error){
        console.error('[SEND] error', error);
        toast('Não consegui enviar: ' + (error.message||''));
        return;
      }

      inputEl.value = '';
      fileEl.value = '';
      setReply(null);

      await loadPosts(); // simple refresh; realtime may append too
    } finally {
      sendBtn.disabled = false;
    }
  }

  // ------ realtime ------
  let channel=null;
  function setupRealtime(){
    if (channel) { try{ client.removeChannel(channel); } catch(e){} }
    channel = client
      .channel('grupo_posts_'+grupoId)
      .on('postgres_changes', { event:'INSERT', schema:'public', table: POSTS_TABLE }, payload=>{
        const p = payload.new;
        // filter by community id
        const cid = p[postsSchema.communityCol] || p.comunidadeId || p.comunidade_id;
        if (String(cid) !== String(grupoId)) return;
        emptyEl.style.display='none';
        feedEl.insertAdjacentHTML('beforeend', postToHtml(p));
        wirePostActions();
        hydrateReactionsForPost(p.id);
        // scroll to bottom if near bottom
      })
      .subscribe();
  }

  // ------ init ------
  async function init(){
    // find groupId
    const params = new URLSearchParams(location.search);
    grupoId = params.get('id') || params.get('grupo') || params.get('comunidade') || params.get('comunidadeId');
    if (!grupoId){
      toast('Grupo inválido (sem id na URL).');
      return;
    }

    // client
    client = window.supabase || window.supabaseClient;
    if (!client){
      toast('Supabase não inicializado.');
      return;
    }

    currentUid = await getUid();

    
// schema
memberSchema = await detectMembersSchema();
postsSchema = await detectPostsSchema();
reactSchema = await detectReactionsSchema();

// admin / solicitações
isAdmin = await detectAdmin();
btnRefreshReq?.addEventListener('click', loadJoinRequests);
    // header + membros + config
    await loadGroup();
    if (btnConfigGrupo) btnConfigGrupo.style.display = isAdmin ? 'inline-flex' : 'none';
    wireConfigModal();
    await loadMembers();

    // wire UI
    joinBtn?.addEventListener('click', requestJoin);
    sendBtn?.addEventListener('click', sendMessage);
    inputEl?.addEventListener('keydown', (e)=>{ if (e.key==='Enter') sendMessage(); });
    replyClose?.addEventListener('click', ()=>setReply(null));

    await refreshGate();
    await loadPosts();
    await loadJoinRequests();
    setupRealtime();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();


