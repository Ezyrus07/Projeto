/* Doke Grupo - melhorias de layout + funções (fallback local)
   - Layout ocupa 100% da área útil (igual chat)
   - Join público / solicitar entrada (privado)
   - Feed de posts (localStorage) + composer com anexos (placeholder)
   - Painel de membros com busca
*/
(function(){
  const LS = {
    groups: 'doke_groups_v1',
    myGroups: 'doke_my_groups_v1',
    requests: 'doke_group_requests_v1',
    postsPrefix: 'doke_group_posts_'
  };

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function safeJsonParse(v, fallback){
    try{ return JSON.parse(v || ''); }catch(e){ return fallback; }
  }
  function readLS(key, fallback){ return safeJsonParse(localStorage.getItem(key), fallback); }
  function writeLS(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

  function toast(msg){
    if(window.dokeToast) return window.dokeToast(msg);
    if(window.showToast) return window.showToast(msg);
    console.log('[DOKE]', msg);
  }

  function getQueryParam(name){
    const u = new URL(location.href);
    return u.searchParams.get(name);
  }

  function ensureSeed(){
    const groups = readLS(LS.groups, []);
    if(groups.length) return;
    // Caso o usuário venha direto no grupo.html, cria seeds iguais ao comunidade-plus
    const seed = [
      { id:'seed-pro', nome:'Profissionais da Pituba', tipo:'Pro', priv:'publico', local:'Pituba, Salvador - BA', membros: 128, createdAt: Date.now()-1000*60*60*24*12, desc:'Rede de profissionais e clientes do bairro.' },
      { id:'seed-cond', nome:'Condomínio Oceania', tipo:'Condomínio', priv:'privado', local:'Pituba, Salvador - BA', membros: 42, createdAt: Date.now()-1000*60*60*24*30, desc:'Avisos internos, regras e comunicação do condomínio.' }
    ];
    writeLS(LS.groups, seed);
    writeLS(LS.myGroups, ['seed-pro']);
    writeLS(LS.requests, []);
  }

  function getGroup(groupId){
    const groups = readLS(LS.groups, []);
    return groups.find(g => g.id===groupId) || null;
  }

  function isMember(groupId){
    const my = new Set(readLS(LS.myGroups, []));
    return my.has(groupId);
  }

  function addMember(groupId){
    const my = new Set(readLS(LS.myGroups, []));
    my.add(groupId);
    writeLS(LS.myGroups, Array.from(my));

    // incrementa contagem se existir
    const groups = readLS(LS.groups, []);
    const g = groups.find(x => x.id===groupId);
    if(g){ g.membros = Math.max(1, (g.membros||0)+1); writeLS(LS.groups, groups); }
  }

  function requestJoin(group){
    const reqs = readLS(LS.requests, []);
    const already = reqs.some(r => r.groupId===group.id && r.status==='pendente');
    if(already){ toast('Você já solicitou entrada.'); return; }
    const id = `req_${Math.random().toString(16).slice(2)}_${Date.now()}`;
    reqs.unshift({ id, groupId: group.id, groupName: group.nome, status:'pendente', createdAt: Date.now() });
    writeLS(LS.requests, reqs);
    toast('Solicitação enviada.');
  }

  function postsKey(groupId){ return `${LS.postsPrefix}${groupId}`; }

  function readPosts(groupId){
    return readLS(postsKey(groupId), []);
  }

  function writePosts(groupId, posts){
    writeLS(postsKey(groupId), posts);
  }

  function seedPostsIfEmpty(group){
    const posts = readPosts(group.id);
    if(posts.length) return;
    const seed = [
      { id:'p1', author:'Admin', text:`Bem-vindo(a) ao ${group.nome}! \n\nUse este espaço para avisos, dúvidas e organização.`, ts: Date.now()-1000*60*60*8, likes: 4 },
      { id:'p2', author:'Usuário', text:'Alguém recomenda um eletricista de confiança? ⚡', ts: Date.now()-1000*60*60*3, likes: 1 }
    ];
    writePosts(group.id, seed);
  }

  function fmtTime(ts){
    const d = new Date(ts);
    return d.toLocaleString(undefined, { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
  }

  function renderHeader(group){
    const nomeEl = $('#grupoNome') || $('.grupo-title') || $('.group-title') || $('h1');
    const descEl = $('#grupoDesc') || $('.grupo-subtitle') || $('.group-subtitle');
    const tipoEl = $('#grupoTipo');
    const membrosEl = $('#grupoMembrosCount');
    if(nomeEl) nomeEl.textContent = group?.nome || 'Grupo';
    if(descEl) descEl.textContent = group?.desc || [group?.tipo, group?.local].filter(Boolean).join(' - ');
    if(tipoEl) tipoEl.textContent = group?.tipo || '';
    if(membrosEl) membrosEl.textContent = (group?.membros!=null) ? `${group.membros} membros` : '';

    // capa (div background)
    const coverDiv = $('#grupoCover') || $('.grupo-cover');
    if(coverDiv && !coverDiv.getAttribute('data-user-set')){
      coverDiv.style.backgroundImage = coverDiv.style.backgroundImage || "url('https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=60')";
    }

    // avatar inicial
    const av = $('#grupoAvatar')?.querySelector('.initial');
    if(av) av.textContent = (group?.nome || 'G').trim().slice(0,1).toUpperCase();
  }

  function renderJoinState(group){
    const member = isMember(group.id);

    // Botão principal (se existir)
    const joinBtn = $('#btnEntrarGrupo') || $('[data-action="join-group"]');
    const joinWrap = $('#joinArea') || $('.join-area');
    const composer = $('.grupo-composer') || $('.group-composer') || $('#grupoComposer');

    // Se o layout antigo não tiver blocos, cria um banner no topo do feed
    let banner = $('#grupoJoinBanner');
    const center = $('.grupo-center') || $('.grupo-pane.grupo-center') || $('.grupo-pane') || $('main');
    if(!banner && center){
      banner = document.createElement('div');
      banner.id = 'grupoJoinBanner';
      banner.style.margin = '18px';
      banner.style.borderRadius = '16px';
      banner.style.border = '1px solid #eef0f4';
      banner.style.background = '#fff';
      banner.style.padding = '16px';
      banner.style.display = 'none';
      banner.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
          <div>
            <div style="font-weight:1000; color:#1d2b3a;">Entre no grupo</div>
            <div style="font-weight:800; color:#6b7a8c; margin-top:2px;">Toque para entrar e começar a postar.</div>
          </div>
          <button id="btnJoinInline" style="border:none; background: linear-gradient(90deg, #0b7768, #2f7eea); color:#fff; padding:12px 16px; border-radius: 14px; font-weight:1000; cursor:pointer;">${group.priv==='privado' ? 'Solicitar entrada' : 'Entrar no grupo'}</button>
        </div>`;
      // insere antes do primeiro conteúdo
      center.prepend(banner);
    }

    const joinInlineBtn = $('#btnJoinInline');

    const apply = ()=>{
      const canPost = member;
      if(composer){ composer.style.opacity = canPost ? '1' : '0.6'; }
      const input = composer?.querySelector('input,textarea');
      if(input){
        input.disabled = !canPost;
        input.placeholder = canPost ? 'Digite uma mensagem para o grupo...' : (group.priv==='privado' ? 'Solicite entrada para postar...' : 'Entre no grupo para postar...');
      }

      if(joinBtn){
        joinBtn.textContent = member ? 'Você já participa' : (group.priv==='privado' ? 'Solicitar entrada' : 'Entrar no grupo');
        joinBtn.disabled = member;
      }

      if(joinWrap){ joinWrap.style.display = member ? 'none' : ''; }
      if(banner){ banner.style.display = member ? 'none' : ''; }
      if(joinInlineBtn && member){ joinInlineBtn.textContent = 'Você já participa'; joinInlineBtn.disabled = true; }
    };

    apply();

    function doJoin(){
      if(member) return;
      if(group.priv==='privado'){
        requestJoin(group);
        if(joinInlineBtn){ joinInlineBtn.textContent = 'Solicitação enviada'; joinInlineBtn.disabled = true; }
        if(joinBtn){ joinBtn.textContent = 'Solicitação enviada'; }
        return;
      }
      addMember(group.id);
      toast('Você entrou no grupo.');
      // re-render
      renderJoinState(group);
      renderFeed(group);
      renderMembers(group);
    }

    joinBtn?.addEventListener('click', doJoin);
    joinInlineBtn?.addEventListener('click', doJoin);
  }

  function renderFeed(group){
    const feed = $('#grupoFeed') || $('.grupo-feed') || $('.group-feed');
    if(!feed) return;

    if(!isMember(group.id)){
      feed.innerHTML = `<div style="padding:22px; color:#6b7a8c; font-weight:900;">Entre no grupo para ver as publicações.</div>`;
      return;
    }

    seedPostsIfEmpty(group);
    const posts = readPosts(group.id).slice().sort((a,b)=>b.ts-a.ts);

    feed.innerHTML = posts.map(p => `
      <article class="gpost" data-id="${p.id}" style="background:#fff; border:1px solid #eef0f4; border-radius:16px; padding:12px; margin: 10px 14px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:42px; height:42px; border-radius:14px; background:#eef2f7; display:flex; align-items:center; justify-content:center; font-weight:1000; color:#2f3b4a;">${escapeHtml((p.author||'?').slice(0,1).toUpperCase())}</div>
            <div>
              <div style="font-weight:1000; color:#1d2b3a;">${escapeHtml(p.author||'Usuário')}</div>
              <div style="font-weight:800; color:#6b7a8c; font-size:0.85rem;">${fmtTime(p.ts)}</div>
            </div>
          </div>
          <button class="gpost-menu" title="Opções" style="border:none; background:#f3f6fa; width:42px; height:42px; border-radius:14px; cursor:pointer; font-weight:1000;">...</button>
        </div>
        <div style="margin-top:12px; white-space:pre-wrap; color:#1d2b3a; font-weight:800; line-height:1.45;">${escapeHtml(p.text||'')}</div>
        <div style="display:flex; gap:10px; margin-top:12px;">
          <button class="gpost-like" style="border:none; background:#f3f6fa; padding:8px 10px; border-radius: 12px; cursor:pointer; font-weight:1000;">Curtir <span>${p.likes||0}</span></button>
          <button class="gpost-reply" style="border:none; background:#f3f6fa; padding:8px 10px; border-radius: 12px; cursor:pointer; font-weight:1000;">Responder</button>
        </div>
      </article>`).join('');

    feed.addEventListener('click', (e)=>{
      const like = e.target.closest('.gpost-like');
      const postEl = e.target.closest('.gpost');
      if(like && postEl){
        const id = postEl.getAttribute('data-id');
        const posts = readPosts(group.id);
        const p = posts.find(x => x.id===id);
        if(p){ p.likes = (p.likes||0)+1; writePosts(group.id, posts); renderFeed(group); }
      }
      const reply = e.target.closest('.gpost-reply');
      if(reply && postEl){
        const author = postEl.querySelector('div[style*="font-weight:1000"]')?.textContent || '';
        focusComposer(`@${author} `);
      }
    }, { once:true });
  }

  function focusComposer(prefix=''){
    const composer = $('.grupo-composer') || $('.group-composer') || $('#grupoComposer');
    const input = composer?.querySelector('input,textarea');
    if(!input) return;
    input.focus();
    if(prefix && !input.value.startsWith(prefix)) input.value = prefix + input.value;
  }

  function bindComposer(group){
    const composer = $('.grupo-composer') || $('.group-composer') || $('#grupoComposer');
    if(!composer) return;

    const input = composer.querySelector('input,textarea');
    const sendBtn = composer.querySelector('button[type="submit"], .btn-send, #btnEnviarGrupo') || composer.querySelector('button');

    function send(){
      if(!isMember(group.id)) return;
      const text = (input?.value || '').trim();
      if(!text) return;
      const posts = readPosts(group.id);
      posts.unshift({ id:`p_${Math.random().toString(16).slice(2)}_${Date.now()}`, author:'Você', text, ts: Date.now(), likes: 0 });
      writePosts(group.id, posts);
      input.value = '';
      renderFeed(group);
      toast('Postado.');
    }

    composer.addEventListener('submit', (e)=>{ e.preventDefault(); send(); });
    sendBtn?.addEventListener('click', (e)=>{ e.preventDefault(); send(); });

    // Ctrl+Enter
    input?.addEventListener('keydown', (e)=>{
      if((e.ctrlKey || e.metaKey) && e.key==='Enter'){
        e.preventDefault();
        send();
      }
    });
  }

  function renderMembers(group){
    const panel = $('#grupoMembers') || $('.grupo-members') || $('.group-members');
    if(!panel) return;

    // Fallback simples: usa contagem e lista básica
    const member = isMember(group.id);
    const count = group.membros || (member ? 1 : 0);

    panel.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding: 16px 18px;">
        <div style="font-weight:1000; font-size:1.1rem; color:#1d2b3a;">Membros</div>
        <div style="font-weight:900; color:#6b7a8c;">${count} no total</div>
      </div>
      <div style="padding: 0 18px 16px;">
        <input id="mSearch" placeholder="Buscar membro..." style="width:100%; padding: 12px 14px; border-radius: 14px; border:1px solid #eef0f4; outline:none; font-weight:900;"/>
      </div>
      <div id="mList" style="display:flex; flex-direction:column; gap: 10px; padding: 0 18px 18px;"></div>
    `;

    const mList = panel.querySelector('#mList');
    const base = [
      { name: 'Usuário', role: 'membro' },
      { name: 'Admin', role: 'admin' },
      ...(member ? [{ name: 'Você', role: 'membro' }] : [])
    ];

    function draw(filter=''){
      const f = filter.trim().toLowerCase();
      const list = base.filter(x => !f || x.name.toLowerCase().includes(f));
      mList.innerHTML = list.map(x => `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding: 12px 14px; border:1px solid #eef0f4; border-radius: 14px; background:#fff;">
          <div style="display:flex; align-items:center; gap: 12px;">
            <div style="width:38px; height:38px; border-radius: 14px; background:#eef2f7; display:flex; align-items:center; justify-content:center; font-weight:1000; color:#2f3b4a;">${escapeHtml(x.name.slice(0,1).toUpperCase())}</div>
            <div>
              <div style="font-weight:1000; color:#1d2b3a;">${escapeHtml(x.name)}</div>
              <div style="font-weight:800; color:#6b7a8c; font-size:0.85rem;">${escapeHtml(x.role)}</div>
            </div>
          </div>
          <span style="font-weight:1000; font-size:0.82rem; color:#0b7768; background:#e8fbf6; border:1px solid #c9f7ea; padding: 8px 10px; border-radius:999px;">${escapeHtml(x.role)}</span>
        </div>`).join('');
    }

    draw();
    const s = panel.querySelector('#mSearch');
    s?.addEventListener('input', ()=> draw(s.value));
  }

  function escapeHtml(s){
    return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function bindLayoutFixes(){
    // garante que o feed ocupe altura e role dentro
    const center = $('.grupo-pane.grupo-center') || $('.grupo-center');
    if(center){
      center.style.minHeight = 'calc(100vh - 110px)';
      center.style.display = 'flex';
      center.style.flexDirection = 'column';
    }

    const feed = $('#grupoFeed') || $('.grupo-feed') || $('.group-feed');
    if(feed && center){
      feed.style.flex = '1 1 auto';
      feed.style.overflow = 'auto';
    }

    const composer = $('.grupo-composer') || $('.group-composer') || $('#grupoComposer');
    if(composer){
      composer.style.position = 'sticky';
      composer.style.bottom = '0';
      composer.style.background = '#fff';
      composer.style.zIndex = '8';
      composer.style.borderTop = '1px solid #eef0f4';
    }
  }

  function init(){
    ensureSeed();

    const groupId = getQueryParam('groupId') || localStorage.getItem('doke_last_group_id') || 'seed-pro';
    localStorage.setItem('doke_last_group_id', groupId);

    const group = getGroup(groupId) || { id: groupId, nome:'Grupo', tipo:'', priv:'publico', local:'', membros: 1, desc:'' };

    renderHeader(group);
    bindLayoutFixes();
    renderJoinState(group);
    bindComposer(group);
    renderFeed(group);
    renderMembers(group);
  }

  if(document.readyState==='loading'){
    window.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();
