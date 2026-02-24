/* Doke Comunidades - melhorias de UX + funções (fallback via localStorage)
   - Tabs: Explorar / Meus / Pendentes
   - Ordenação
   - Skeleton loaders
   - Criação de grupo com privacidade (público/privado)
   - Solicitação de entrada (privado) com pendências
*/
(function(){
  const LS = {
    groups: 'doke_groups_v1',
    myGroups: 'doke_my_groups_v1',
    requests: 'doke_group_requests_v1',
    lastTab: 'doke_comm_last_tab',
    sort: 'doke_comm_sort'
  };

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function safeJsonParse(v, fallback){
    try{ return JSON.parse(v || ''); }catch(e){ return fallback; }
  }
  function readLS(key, fallback){
    return safeJsonParse(localStorage.getItem(key), fallback);
  }
  function writeLS(key, val){
    localStorage.setItem(key, JSON.stringify(val));
  }

  function toast(msg){
    if(window.dokeToast) return window.dokeToast(msg);
    if(window.showToast) return window.showToast(msg);
    console.log('[DOKE]', msg);
  }
  function alertWarn(msg){
    if(window.dokeAlert) return window.dokeAlert('Aviso', msg);
    if(window.showAlert) return window.showAlert('Aviso', msg);
    alert(msg);
  }

  function ensureSeed(){
    const groups = readLS(LS.groups, []);
    if(groups.length) return;
    const seed = [
      { id:'seed-pro', nome:'Profissionais da Pituba', tipo:'Pro', priv:'publico', local:'Pituba, Salvador - BA', membros: 128, createdAt: Date.now()-1000*60*60*24*12 },
      { id:'seed-cond', nome:'Condomínio Oceania', tipo:'Condomínio', priv:'privado', local:'Pituba, Salvador - BA', membros: 42, createdAt: Date.now()-1000*60*60*24*30 },
      { id:'seed-hobby', nome:'Corrida & Saúde', tipo:'Hobby', priv:'publico', local:'Salvador - BA', membros: 311, createdAt: Date.now()-1000*60*60*24*6 }
    ];
    writeLS(LS.groups, seed);
    writeLS(LS.myGroups, ['seed-pro']);
    writeLS(LS.requests, []);
  }

  function getDomCards(){
    const container = $('#listaComunidades');
    if(!container) return [];
    return $$('.com-card, .card-comm', container);
  }

  function cardMeta(card){
    const titleEl = card.querySelector('.com-title,.card-title,[data-title]');
    const nome = (titleEl ? titleEl.textContent : '').trim();
    const tipo = (card.getAttribute('data-tipo') || (card.querySelector('.pill')?.textContent || '')).trim();
    const membersTxt = (card.querySelector('.members')?.textContent || card.querySelector('.meta')?.textContent || '').toLowerCase();
    const m = membersTxt.match(/(\d+)/);
    const membros = m ? parseInt(m[1],10) : 0;
    const createdAt = parseInt(card.getAttribute('data-created') || '0', 10) || 0;
    const local = (card.getAttribute('data-local') || '').trim();
    const priv = (card.getAttribute('data-priv') || '').trim();
    const id = (card.getAttribute('data-id') || '').trim();
    return { id, nome, tipo, membros, createdAt, local, priv, card };
  }

  function setActiveTab(tab){
    const btns = ['explorar','meus','pendentes'];
    btns.forEach(t => {
      const b = document.querySelector(`.comm-tab[data-tab="${t}"]`);
      if(b) b.classList.toggle('active', t===tab);
    });

    const grid = $('#listaComunidades');
    const meus = $('#listaMeusGrupos')?.closest('.my-groups-section');

    // Explore: mostra grid + meus (compacto)
    if(tab==='explorar'){
      if(grid) grid.style.display = '';
      if(meus) meus.style.display = '';
      renderPendencias(false);
    }

    // Meus: foca nos meus grupos e oculta grid (pra preencher visual)
    if(tab==='meus'){
      if(grid) grid.style.display = 'none';
      if(meus) meus.style.display = '';
      renderPendencias(false);
      // scroll suave até a seção
      setTimeout(()=> meus?.scrollIntoView({behavior:'smooth', block:'start'}), 50);
    }

    // Pendentes: mostra painel de pendências no lugar do grid
    if(tab==='pendentes'){
      if(meus) meus.style.display = '';
      if(grid){
        grid.style.display = '';
        renderPendencias(true);
      }
    }

    localStorage.setItem(LS.lastTab, tab);
  }

  function renderSkeletonGrid(){
    const grid = $('#listaComunidades');
    if(!grid) return;
    const html = Array.from({length:8}).map(()=>
      `<div class="skel-card">
        <div class="skel-cover"></div>
        <div class="skel-body">
          <div class="skel-avatar"></div>
          <div class="skel-lines">
            <div class="skel-line lg"></div>
            <div class="skel-line md"></div>
            <div class="skel-line sm"></div>
          </div>
        </div>
      </div>`
    ).join('');
    grid.innerHTML = `<div class="comm-skel-grid">${html}</div>`;
  }

  function applySort(mode){
    const grid = $('#listaComunidades');
    if(!grid) return;
    const cards = getDomCards();
    if(!cards.length) return;

    const meta = cards.map(cardMeta);

    const by = {
      relevancia: (a,b) => (b.membros - a.membros) || (b.createdAt - a.createdAt),
      membros: (a,b) => (b.membros - a.membros),
      recentes: (a,b) => (b.createdAt - a.createdAt),
      proximos: (a,b) => {
        const la = (a.local||'').toLowerCase();
        const lb = (b.local||'').toLowerCase();
        const userLocal = (localStorage.getItem('doke_local_label')||'').toLowerCase();
        const sa = userLocal && la.includes(userLocal) ? 1 : 0;
        const sb = userLocal && lb.includes(userLocal) ? 1 : 0;
        return (sb - sa) || (b.membros - a.membros);
      }
    };

    meta.sort(by[mode] || by.relevancia);
    meta.forEach(m => grid.appendChild(m.card));
    localStorage.setItem(LS.sort, mode);
  }

  function updateBadges(){
    const exploreCount = getDomCards().length;
    const meusCount = ($$('#listaMeusGrupos .grupo-item, #listaMeusGrupos .my-group-card, #listaMeusGrupos > *').filter(el => el && el.textContent && !el.textContent.includes('Carregando')).length) || 0;
    const pend = readLS(LS.requests, []).filter(r => r.status==='pendente').length;

    const be = $('#badgeExplorar'); if(be) be.textContent = exploreCount;
    const bm = $('#badgeMeus'); if(bm) bm.textContent = meusCount;
    const bp = $('#badgePend'); if(bp) bp.textContent = pend;
  }

  function renderPendencias(active){
    const grid = $('#listaComunidades');
    if(!grid) return;
    if(!active){
      // remove placeholder de pendências se existir
      const pend = $('#commPendencias');
      if(pend) pend.remove();
      return;
    }

    const reqs = readLS(LS.requests, []).filter(r => r.status==='pendente');

    const panel = document.createElement('div');
    panel.id = 'commPendencias';
    panel.style.gridColumn = '1 / -1';
    panel.style.background = '#fff';
    panel.style.border = '1px solid #eef0f4';
    panel.style.borderRadius = '16px';
    panel.style.padding = '18px';
    panel.style.marginBottom = '18px';

    panel.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
        <div>
          <div style="font-weight:1000; font-size:1.05rem; color:#1d2b3a;">Solicitações pendentes</div>
          <div style="color:#6b7a8c; font-weight:800; margin-top:2px;">Pedidos de entrada em grupos privados.</div>
        </div>
        <button id="btnLimparPend" style="border:none; background:#f2f4f7; padding:10px 12px; border-radius:12px; font-weight:900; cursor:pointer;">Limpar</button>
      </div>
      <div style="margin-top:14px; display:flex; flex-direction:column; gap:10px;" id="pendList"></div>
    `;

    const list = panel.querySelector('#pendList');
    if(!reqs.length){
      list.innerHTML = `<div style="padding:16px; border-radius:14px; background:#f8fafc; border:1px dashed #e6ecf2; color:#6b7a8c; font-weight:800;">Nenhuma solicitação pendente.</div>`;
    }else{
      list.innerHTML = reqs.map(r => `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px; border-radius:14px; border:1px solid #eef0f4;">
          <div>
            <div style="font-weight:1000; color:#1d2b3a;">${escapeHtml(r.groupName || 'Grupo')}</div>
            <div style="color:#6b7a8c; font-weight:800; font-size:0.9rem;">Enviado em ${new Date(r.createdAt||Date.now()).toLocaleDateString()}</div>
          </div>
          <div style="display:flex; gap:10px;">
            <button data-act="cancel" data-id="${r.id}" style="border:none; background:#fff4f4; color:#b42318; padding:10px 12px; border-radius:12px; font-weight:1000; cursor:pointer;">Cancelar</button>
            <button data-act="abrir" data-gid="${r.groupId}" style="border:none; background:#0b7768; color:#fff; padding:10px 12px; border-radius:12px; font-weight:1000; cursor:pointer;">Abrir</button>
          </div>
        </div>`).join('');
    }

    // insere no topo
    grid.prepend(panel);

    panel.addEventListener('click', (e)=>{
      const btn = e.target.closest('button');
      if(!btn) return;
      if(btn.id==='btnLimparPend'){
        const all = readLS(LS.requests, []).map(r => ({...r, status:'arquivado'}));
        writeLS(LS.requests, all);
        toast('Pendências arquivadas.');
        updateBadges();
        renderPendencias(true);
        return;
      }
      const act = btn.getAttribute('data-act');
      if(act==='cancel'){
        const id = btn.getAttribute('data-id');
        const all = readLS(LS.requests, []).map(r => r.id===id ? ({...r, status:'cancelado'}) : r);
        writeLS(LS.requests, all);
        toast('Solicitação cancelada.');
        updateBadges();
        renderPendencias(true);
      }
      if(act==='abrir'){
        const gid = btn.getAttribute('data-gid');
        if(gid) location.href = `grupo.html?groupId=${encodeURIComponent(gid)}`;
      }
    });
  }

  function escapeHtml(s){
    return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function enhanceCreateGroup(){
    // Faz fallback caso o patch do Supabase falhe
    const form = document.querySelector('#modalCriarComm form');
    if(!form) return;

    // Encapsula o handler existente (se houver)
    const old = window.criarNovaComunidade;
    window.criarNovaComunidade = async function(ev){
      try{
        if(typeof old === 'function'){
          // deixa o handler original tentar
          const maybe = old(ev);
          // se ele retornar Promise, aguarda
          if(maybe && typeof maybe.then === 'function') await maybe;
          // se chegou aqui sem erro, ok
          setTimeout(updateBadges, 300);
          return;
        }
      }catch(err){
        console.warn('[DOKE] criarNovaComunidade original falhou, usando fallback.', err);
      }

      // fallback local
      ev?.preventDefault?.();
      ensureSeed();

      const nome = $('#commNome')?.value?.trim();
      const desc = $('#commDesc')?.value?.trim();
      const tipo = $('#commTipo')?.value?.trim() || 'Pro';
      const priv = $('#commPriv')?.value || 'publico';
      const local = $('#commLocal')?.value?.trim() || '';

      if(!nome || !desc){
        alertWarn('Preencha nome e descrição.');
        return;
      }

      const id = `ls_${Math.random().toString(16).slice(2)}_${Date.now()}`;
      const groups = readLS(LS.groups, []);
      groups.unshift({ id, nome, tipo, priv, local, membros: 1, createdAt: Date.now(), desc });
      writeLS(LS.groups, groups);

      const my = new Set(readLS(LS.myGroups, []));
      my.add(id);
      writeLS(LS.myGroups, Array.from(my));

      toast('Grupo criado (modo offline).');
      try{ window.fecharModalCriarComm?.(); }catch(e){}
      setActiveTab('meus');
      updateBadges();
    };
  }

  function hookTabs(){
    const toolbar = $('#commToolbar');
    if(!toolbar) return;

    toolbar.addEventListener('click', (e)=>{
      const btn = e.target.closest('.comm-tab');
      if(!btn) return;
      const tab = btn.getAttribute('data-tab');
      if(tab) setActiveTab(tab);
    });

    const sortSel = $('#commSortSelect');
    if(sortSel){
      sortSel.addEventListener('change', ()=> applySort(sortSel.value));
      const saved = localStorage.getItem(LS.sort);
      if(saved) sortSel.value = saved;
    }

    const last = localStorage.getItem(LS.lastTab) || 'explorar';
    setActiveTab(last);
  }

  function init(){
    ensureSeed();
    enhanceCreateGroup();

    // Se ainda estiver carregando, coloca skeleton. O script de supabase pode substituir depois.
    const grid = $('#listaComunidades');
    if(grid && grid.textContent.includes('Buscando comunidades')){
      renderSkeletonGrid();
    }

    hookTabs();

    // Atualiza badges e ordenação após o layout montar
    setTimeout(()=>{
      updateBadges();
      const sortSel = $('#commSortSelect');
      if(sortSel) applySort(sortSel.value);
    }, 600);

    // Quando o supabase preencher a lista depois, reconta
    const mo = new MutationObserver(()=>{
      updateBadges();
    });
    if(grid) mo.observe(grid, {childList:true, subtree:true});
  }

  if(document.readyState==='loading'){
    window.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();


/* v7.1 runtime tweaks */
(function(){
  try{
    const root = document;
    const normalizeButtons = ()=>{
      root.querySelectorAll('button, .btn').forEach(b=>{
        const t=(b.textContent||'').replace(/\s+/g,' ').trim();
        if(!t) return;
        if(/solicitar entrada/i.test(t)) b.title='Solicitar entrada';
        if(/entrar/i.test(t)) b.classList.add('btn-cta-comunidade');
      });
    };
    const clampDescriptions = ()=>{
      root.querySelectorAll('.com-desc, .com-meta, .card-subtitle, .descricao').forEach(el=>{
        el.style.overflowWrap='anywhere';
      });
    };
    normalizeButtons(); clampDescriptions();
    const mo = new MutationObserver(()=>{ normalizeButtons(); clampDescriptions(); });
    mo.observe(document.body,{subtree:true,childList:true});
  }catch(e){ console.warn('[comunidade-plus v7.1] tweaks skip', e); }
})();
