(function(){
  const listEl = document.getElementById('listaComunidades');
  const myEl = document.getElementById('listaMeusGrupos');
  const inputEl = document.getElementById('inputBuscaComm');
  const chips = Array.from(document.querySelectorAll('.com-chip'));
  let allItems = [];
  let activeFilter = 'todos';

  function esc(v){return String(v||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function getClient(){ return window.sb || window.supabaseClient || null; }
  async function getUid(){ try{return String(await (window.dokeResolvedUidPromise||'' ) || localStorage.getItem('doke_uid') || '').trim(); }catch(_){return '';} }
  function coverStyle(item){ const url = item.capa_url || item.capa || item.imagem_capa || ''; return url ? `background-image:url('${String(url).replace(/'/g,"\\'")}')` : ''; }
  function thumb(item){ return item.thumb_url || item.icone_url || item.avatar_url || ''; }
  function normalizeType(t){ const raw=String(t||'').toLowerCase(); if(raw.includes('pro')) return 'profissionais'; if(raw.includes('cond')) return 'condominios'; if(raw.includes('hobby')) return 'hobbies'; return raw || 'todos'; }
  function matchesFilter(item){ if(activeFilter==='todos') return true; const tipo=normalizeType(item.tipo||item.tipo_comunidade); if(activeFilter==='novos') return true; if(activeFilter==='emalta') return (Number(item.membros_count||item.membrosCount||0) >= 50) || tipo==='profissionais'; if(activeFilter==='pertodevoce') return /bairro|cidade|local|vizinh/i.test(String(item.descricao||'')) || tipo==='condominios'; return tipo===activeFilter; }
  function matchesSearch(item){ const q=String(inputEl?.value||'').toLowerCase().trim(); if(!q) return true; return `${item.nome||''} ${item.descricao||''} ${item.tipo||''}`.toLowerCase().includes(q); }
  function renderList(){
    const items = allItems.filter(i=>matchesFilter(i)&&matchesSearch(i));
    if(!items.length){ listEl.innerHTML = '<div class="com-empty"><h3>Nenhuma comunidade encontrada</h3><p>Não achei grupos para os filtros atuais.</p></div>'; return; }
    listEl.innerHTML = items.map(item=>{
      const id = item.id || item.comunidade_id || item.uuid || '';
      const isMember = !!item.__joined;
      const members = Number(item.membros_count || item.membrosCount || (Array.isArray(item.membros)?item.membros.length:0) || 0);
      return `<article class="com-card" data-id="${esc(id)}"><div class="com-card-cover" style="${coverStyle(item)}"></div><div class="com-card-body"><div class="com-card-head"><div class="com-card-avatar">${thumb(item)?`<img src="${esc(thumb(item))}" alt="">`:`<i class='bx bx-group'></i>`}</div><button class="com-card-enter" data-id="${esc(id)}">${isMember?'Entrou':'Entrar'}</button></div><h3 class="com-card-title">${esc(item.nome||item.titulo||'Comunidade')}</h3><p class="com-card-desc">${esc(item.descricao||'')}</p><div class="com-card-meta"><span class="com-pill">${esc(item.tipo||item.tipo_comunidade||'Grupo')}</span><span class="com-pill">${esc(item.privacidade||item.tipoPrivacidade||'Público')}</span><span class="com-members">+${members} membros</span></div></div></article>`;
    }).join('');
  }
  function skeleton(){
    listEl.innerHTML = `<div class="com-skeleton-wrap"><div class="com-skeleton-grid">${Array.from({length:4}).map(()=>`<div class="com-skeleton"><div class="com-skeleton-cover"></div><div class="com-skeleton-body"><div class="com-skeleton-line medium"></div><div class="com-skeleton-line"></div><div class="com-skeleton-line short"></div><div class="com-skeleton-pills"><div class="com-skeleton-pill"></div><div class="com-skeleton-pill"></div></div></div></div>`).join('')}</div></div>`;
    myEl.innerHTML = Array.from({length:3}).map(()=>`<div class="com-groups-item"><div class="com-groups-thumb"><span>•</span></div><span>...</span></div>`).join('');
  }
  async function readCommunities(){
    const client=getClient(); if(!client||typeof client.from!=='function') return [];
    let res = await client.from('comunidades').select('*').limit(40);
    if(res.error) throw res.error;
    return res.data || [];
  }
  async function markMembership(items){
    const client=getClient(); const uid=await getUid(); if(!uid||!client) return items;
    try{
      let joinedRes = await client.from('comunidade_membros').select('*').eq('user_id', uid);
      const joinedIds = new Set((joinedRes.data||[]).map(r=>String(r.comunidade_id||r.community_id||r.grupo_id||'')));
      items.forEach(i=>{ const id=String(i.id||i.comunidade_id||i.uuid||''); i.__joined = joinedIds.has(id) || (Array.isArray(i.membros)&&i.membros.includes(uid)); });
    }catch(_e){ items.forEach(i=>{ if(Array.isArray(i.membros)) i.__joined=i.membros.includes(uid); }); }
    return items;
  }
  function renderMyGroups(){
    const joined = allItems.filter(i=>i.__joined).slice(0,8);
    if(!joined.length){ myEl.innerHTML = '<div class="com-groups-item"><div class="com-groups-thumb"><span>+</span></div><span>Nenhum</span></div>'; return; }
    myEl.innerHTML = joined.map(item=>`<div class="com-groups-item" data-id="${esc(item.id||'')}"><div class="com-groups-thumb">${thumb(item)?`<img src="${esc(thumb(item))}" alt="">`:`<span>${esc(String(item.nome||'C').charAt(0).toUpperCase())}</span>`}</div><span>${esc(item.nome||'Comunidade')}</span></div>`).join('');
  }
  async function load(){
    skeleton();
    try{
      allItems = await markMembership(await readCommunities());
      renderMyGroups();
      renderList();
    }catch(err){
      console.error('comunidades load', err);
      listEl.innerHTML = '<div class="com-empty"><h3>Não foi possível carregar comunidades</h3><p>Tente novamente em instantes.</p></div>';
      myEl.innerHTML = '';
    }
  }
  chips.forEach(btn=>btn.addEventListener('click',()=>{ chips.forEach(c=>c.classList.remove('active')); btn.classList.add('active'); activeFilter=btn.dataset.filter; renderList(); }));
  inputEl?.addEventListener('input', renderList);
  document.getElementById('commFilterPrev')?.addEventListener('click',()=> document.getElementById('commFilterTabs').scrollBy({left:-220,behavior:'smooth'}));
  document.getElementById('commFilterNext')?.addEventListener('click',()=> document.getElementById('commFilterTabs').scrollBy({left:220,behavior:'smooth'}));
  listEl?.addEventListener('click', (ev)=>{ const btn=ev.target.closest('.com-card-enter'); const card=ev.target.closest('.com-card'); const id=(btn||card)?.dataset.id; if(!id) return; location.href='grupo.html?id='+encodeURIComponent(id); });
  myEl?.addEventListener('click', (ev)=>{ const item=ev.target.closest('.com-groups-item[data-id]'); if(item) location.href='grupo.html?id='+encodeURIComponent(item.dataset.id); });
  document.querySelector('.com-create')?.addEventListener('click', ()=>{ const modal=document.getElementById('modalCriarComm'); if(modal) modal.style.display='flex'; });
  document.addEventListener('DOMContentLoaded', load, {once:true});
})();
