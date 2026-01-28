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
        const { data } = await client.auth.getUser();
        if (data?.user?.id) return data.user.id;
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

      toast(privateGroup ? 'Solicitação enviada ✅' : 'Entrou no grupo ✅');
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
            <button class="btn-act btn-reply" ${canAct ? '' : 'disabled'} title="Responder">↩️ <span>Responder</span></button>
            <button class="btn-act btn-react" ${canAct ? '' : 'disabled'} title="Reagir">👍 <span>Reagir</span></button>
            <button class="btn-act btn-del" ${canDelete && canAct ? '' : 'disabled'} title="Excluir">🗑️ <span>Excluir</span></button>
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
        await toggleReaction(postId, '👍');
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

    // wire UI
    joinBtn?.addEventListener('click', requestJoin);
    sendBtn?.addEventListener('click', sendMessage);
    inputEl?.addEventListener('keydown', (e)=>{ if (e.key==='Enter') sendMessage(); });
    replyClose?.addEventListener('click', ()=>setReply(null));

    await refreshGate();
    await loadPosts();
    setupRealtime();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
