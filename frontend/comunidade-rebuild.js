
(function(){
  function qs(sel,ctx){return (ctx||document).querySelector(sel)}
  function qsa(sel,ctx){return Array.from((ctx||document).querySelectorAll(sel))}
  function hero(){
    const h=qs('.comm-hero-container');
    if(h) h.style.display='block';
  }
  function decorateCards(){
    const list=qs('#listaComunidades'); if(!list) return;
    qsa(':scope > *', list).forEach(card=>{
      if(card.classList.contains('comm-skeleton-grid')||card.classList.contains('empty-state')) return;
      if(card.querySelector('.com-body')) return;
      const rawText=card.textContent.replace(/\s+/g,' ').trim();
      if(!rawText) return;
      // ignore legacy loader text
      if(/carregando comunidades/i.test(rawText)) return;
      const lines=rawText.split(/\s{2,}/).filter(Boolean);
      const title=lines[0]||'Comunidade';
      const desc=lines[1]||'';
      const joined=/entrou/i.test(rawText) ? 'Entrou' : 'Ver grupo';
      const members=(rawText.match(/\+?\d+\s*membros?/i)||[''])[0] || '';
      const tipo=(rawText.match(/Pro|Condom[ií]nio|Hobby|Público|Privado/i)||[''])[0] || '';
      card.innerHTML=`<div class="com-cover"></div><div class="com-body"><div class="com-avatar"><i class="bx bx-group"></i></div><div class="com-info"><div class="com-title">${title}</div><div class="com-desc">${desc}</div><div class="com-meta">${tipo?`<span class="pill">${tipo}</span>`:''}${members?`<span class="meta-small">${members}</span>`:''}</div></div><button class="btn-ver-grupo">${joined}</button></div>`;
    });
  }
  function normalizeStates(){
    const list=qs('#listaComunidades'); if(!list) return;
    const text=list.textContent.replace(/\s+/g,' ').trim();
    if(/carregando comunidades/i.test(text) && !list.querySelector('.comm-skeleton-grid')){
      list.innerHTML='<div class="comm-skeleton-grid" aria-hidden="true"><div class="comm-skel-card"></div><div class="comm-skel-card"></div></div>';
      return;
    }
    const hasCards=qsa(':scope > *', list).some(el=>!el.classList.contains('comm-skeleton-grid')&&!el.classList.contains('empty-state'));
    if(!hasCards && /nenhuma comunidade/i.test(text)){
      list.innerHTML='<div class="empty-state">Nenhuma comunidade encontrada no momento.</div>';
    }
    decorateCards();
  }
  function cleanHeroStats(){
    qsa('.comm-hero-stats').forEach(el=>el.remove());
    const label=qs('.my-groups-section .section-label'); if(label) label.textContent='Meus grupos';
  }
  function init(){ hero(); cleanHeroStats(); normalizeStates(); }
  document.addEventListener('DOMContentLoaded', init);
  const mo=new MutationObserver(()=>{ hero(); normalizeStates(); });
  window.addEventListener('load', ()=>{ init(); const list=qs('#listaComunidades'); if(list) mo.observe(list,{childList:true,subtree:true}); });
})();
