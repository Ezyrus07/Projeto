
(function(){
  function q(s,r){ return (r||document).querySelector(s); }
  function qa(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); }
  function safeVisible(el){ if(!el) return false; var cs=getComputedStyle(el); return cs.display!=='none' && cs.visibility!=='hidden' && cs.opacity!=='0'; }
  function norm(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim(); }
  function coluna(){ return q('.coluna-lista.pedidos-ux') || q('.coluna-lista'); }
  function detectStatus(card){
    var t = norm(card && card.textContent);
    if (t.includes('urgente')) return 'urgente';
    if (t.includes('finalizado') || t.includes('concluido')) return 'finalizado';
    if (t.includes('andamento')) return 'andamento';
    return 'todos';
  }
  function getVisibleListCards(){
    var root = q('#pedidosLista'); if(!root) return [];
    return qa('.item-pedido', root).filter(function(el){ return el.isConnected && safeVisible(el) && el.offsetParent !== null; });
  }
  function countFromCards(){
    var cards = qa('#pedidosLista .item-pedido').filter(function(el){ return el.isConnected; });
    var counts = { todos:0, andamento:0, urgente:0, finalizado:0 };
    cards.forEach(function(card){
      counts.todos += 1;
      var st = detectStatus(card);
      if (st === 'andamento') counts.andamento += 1;
      if (st === 'urgente') counts.urgente += 1;
      if (st === 'finalizado') counts.finalizado += 1;
    });
    return counts;
  }
  function ensureHeroSingleBadge(){
    var c = coluna(); if(!c) return;
    var hero = q('.pedidos-hero-v12', c); if(!hero) return;
    var h1 = q('h1', hero); var row = q('.pedidos-hero-v12__titleRow', hero) || (h1 ? h1.parentElement : null) || hero;
    if(!row) return;
    var counts = countFromCards();
    var keep = q('#pedidosHeroBadge', row) || q('.pedidos-hero-v12__badge', row);
    if(!keep){
      keep = document.createElement('span');
      keep.className = 'pedidos-hero-v12__badge';
      row.appendChild(keep);
    }
    keep.id = 'pedidosHeroBadge';
    keep.classList.add('pedidos-hero-v12__badge','v23-primary-hero-badge');
    keep.textContent = String(counts.todos || 0);
    var badges = qa(':scope > .badge, :scope > .hero-badge, :scope > .pedidos-hero-v12__badge, :scope > [data-role="count"]', row)
      .filter(function(el){ return el !== keep && /\d/.test((el.textContent||'').trim()); });
    badges.forEach(function(el){ el.remove(); });
  }
  function removeLegacyStatusBlocks(){
    var c = coluna(); if(!c) return;
    qa('*', c).forEach(function(el){
      if (!el || !el.classList) return;
      if (el.closest('.pedidos-statusbar-v18')) return;
      var txt = norm(el.textContent);
      if (!txt) return;
      var isLegacy = (txt.includes('hoje:') && txt.includes('urgentes:')) || (txt.includes('hoje') && txt.includes('em andamento:') && txt.includes('urgentes:'));
      if (isLegacy && !el.matches('#pedidosLista') && !el.closest('#pedidosLista')) el.classList.add('v23-force-hide-legacy');
    });
  }
  function normalizeStatusLabels(){
    var labelMap = { todos:'Todos', andamento:'Em andamento', urgente:'Urgentes', finalizado:'Finalizados' };
    qa('.pedidos-status-chip-v18').forEach(function(chip){
      var status = chip.dataset.status || '';
      var lbl = q('.lbl', chip);
      if (lbl && labelMap[status]) lbl.textContent = labelMap[status];
    });
  }
  function fixSelectPlacement(){
    var row = q('.pedidos-status-row-v18');
    var filters = q('.pedidos-status-filters-v18', row || document);
    var search = q('.pedidos-searchbar-v18', row || document);
    var select = q('.v18-select-btn', row || document) || q('#btnSelecionarPedidos', row || document);
    if (row && filters && select && search){
      if (select.parentElement !== row) row.appendChild(select);
      if (search.parentElement !== row) row.appendChild(search);
      row.insertBefore(select, search);
    }
  }
  function bindSearchFilterBtn(){
    qa('.v20-search-filter-btn, .v19-search-filter-btn, .v18-search-filter-btn').forEach(function(btn){
      if (btn.dataset.v23Bound) return;
      btn.dataset.v23Bound = '1';
      btn.addEventListener('click', function(ev){
        try {
          if (typeof window.toggleListaFiltros === 'function') { ev.preventDefault(); ev.stopPropagation(); window.toggleListaFiltros(ev); return; }
          if (typeof window.toggleListaFilters === 'function') { ev.preventDefault(); ev.stopPropagation(); window.toggleListaFilters(ev); return; }
        } catch(_){}
      }, true);
    });
  }
  function fixPedidoCardHeights(){
    var cards = qa('#pedidosLista .item-pedido');
    if (!cards.length) return;
    cards.forEach(function(card){
      var h4 = q('.ip-header h4', card);
      if (h4) h4.style.minHeight = '';
    });
    // equalize per row on desktop only
    if (window.innerWidth <= 768) return;
    var byTop = {};
    cards.forEach(function(card){
      var h4 = q('.ip-header h4', card); if(!h4) return;
      var top = Math.round(card.getBoundingClientRect().top);
      (byTop[top] = byTop[top] || []).push(h4);
    });
    Object.keys(byTop).forEach(function(k){
      var maxH = 0;
      byTop[k].forEach(function(h4){ maxH = Math.max(maxH, h4.getBoundingClientRect().height); });
      byTop[k].forEach(function(h4){ h4.style.minHeight = Math.ceil(maxH) + 'px'; });
    });
  }
  function apply(){
    try {
      ensureHeroSingleBadge();
      removeLegacyStatusBlocks();
      normalizeStatusLabels();
      fixSelectPlacement();
      bindSearchFilterBtn();
      fixPedidoCardHeights();
    } catch(err){ console.warn('pedidos v23 cleanup:', err); }
  }
  var t;
  function queue(){ clearTimeout(t); t = setTimeout(apply, 50); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', queue, {once:true});
  window.addEventListener('load', queue);
  window.addEventListener('resize', queue);
  setTimeout(queue, 120);
  setTimeout(queue, 500);
  setTimeout(queue, 1200);
  try {
    var mo = new MutationObserver(queue);
    mo.observe(document.documentElement, { childList:true, subtree:true, characterData:true });
    setTimeout(function(){ try{ mo.disconnect(); }catch(_){} }, 5000);
  } catch(_){}
})();
