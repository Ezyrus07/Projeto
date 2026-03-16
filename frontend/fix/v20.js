
(function(){
  if (window.__pedidosV20FinalHotfixInstalled) return;
  window.__pedidosV20FinalHotfixInstalled = true;

  function q(sel, root){ return (root||document).querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
  function text(el){ return (el && (el.textContent||'') || '').trim(); }
  function norm(s){
    try { return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
    catch(e){ return String(s||'').toLowerCase(); }
  }
  function getCol(){ return q('.coluna-lista.pedidos-ux') || q('.coluna-lista'); }

  function hideLegacyBlocks(col){
    ['.pedidos-pro-toolbar','.pedidos-pro-chips','.pedidos-pro-stats','.pedidos-top-row-v15','.pedidos-kpi-wrap-v12','.pedidos-kpis-inline-v17','.pedidos-mini-kpis-v17','.pedidos-old-kpis','#listaViewToggle','.lista-tools-divider']
      .forEach(function(sel){ qa(sel,col).forEach(function(el){ el.style.display='none'; }); });

    qa('div,section,ul', col).forEach(function(node){
      if (node.closest('.pedidos-statusbar-v18') || node.closest('.pedidos-hero-v12') || node.closest('#pedidosLista')) return;
      var t = norm(node.textContent || '');
      if (!t) return;
      var hasLegacy = (t.indexOf('hoje') >= 0 || t.indexOf('em andamento') >= 0 || t.indexOf('urgentes') >= 0);
      var small = (node.offsetHeight > 0 && node.offsetHeight < 90 && node.offsetWidth < 420);
      if (hasLegacy && small && node.children && node.children.length <= 6 && !(String(node.className||'').indexOf('pedidos-status-chip-v18')>=0)) {
        node.style.display = 'none';
      }
    });
  }

  function ensureStatusChipLabels(col){
    var map = { todos:'Todos', pendente:'Pendentes', andamento:'Em andamento', urgente:'Urgentes', finalizado:'Finalizados' };
    qa('.pedidos-status-chip-v18', col).forEach(function(btn){
      var st = (btn.getAttribute('data-status') || '').toLowerCase();
      btn.classList.toggle('andamento', st === 'andamento');
      btn.classList.toggle('urgente', st === 'urgente');
      btn.classList.toggle('finalizado', st === 'finalizado');
      var lbl = q('.lbl', btn), val = q('.val', btn);
      if (!lbl) { lbl = document.createElement('span'); lbl.className='lbl'; btn.insertBefore(lbl, btn.firstChild); }
      if (!val) { val = document.createElement('span'); val.className='val'; btn.appendChild(val); }
      lbl.textContent = map[st] || (st || 'Status');
      btn.setAttribute('type','button');
    });
  }

  function dedupeHeroBadge(col){
    var row = q('.pedidos-hero-v12__titleRow', col); if (!row) return;
    var title = q('.pedidos-hero-v12__title', row); if (!title) return;
    var badges = qa('.pedidos-hero-v12__badge, .badge', row).filter(function(el){ return /badge/i.test(el.className||''); });
    var keep = badges[0];
    if (!keep) {
      keep = document.createElement('span'); keep.className = 'pedidos-hero-v12__badge badge'; keep.textContent = '0';
      title.insertAdjacentElement('afterend', keep);
    }
    badges.forEach(function(b){ if (b !== keep) b.remove(); });
    keep.classList.add('pedidos-hero-v12__badge','badge');
  }

  function detectStatus(card){
    var t = norm(card.textContent || '');
    if (t.indexOf('urgente') >= 0) return 'urgente';
    if (t.indexOf('finalizado') >= 0 || t.indexOf('concluido') >= 0) return 'finalizado';
    if (t.indexOf('em andamento') >= 0 || t.indexOf('andamento') >= 0) return 'andamento';
    if (t.indexOf('pendente') >= 0 || t.indexOf('aguardando') >= 0) return 'pendente';
    return 'todos';
  }

  function syncCounts(col){
    var chips = {}; qa('.pedidos-status-chip-v18', col).forEach(function(btn){ chips[(btn.getAttribute('data-status')||'').toLowerCase()] = btn; });
    var cards = qa('#pedidosLista .item-pedido', col).filter(function(el){ return !el.hasAttribute('hidden') && getComputedStyle(el).display !== 'none'; });
    var counts = { todos:0, andamento:0, urgente:0, finalizado:0, pendente:0 };
    cards.forEach(function(card){ counts.todos += 1; var s = detectStatus(card); counts[s] = (counts[s]||0) + 1; });
    Object.keys(chips).forEach(function(key){ var val = q('.val', chips[key]); if (val) val.textContent = String(counts[key]||0); });
    var heroBadge = q('.pedidos-hero-v12__titleRow .pedidos-hero-v12__badge, .pedidos-hero-v12__titleRow .badge', col);
    if (heroBadge) heroBadge.textContent = String(counts.todos || 0);
    var kTodos=q('#pedidosKpiHoje',col), kAnd=q('#pedidosKpiAnd',col), kUrg=q('#pedidosKpiUrg',col);
    if (kTodos) kTodos.textContent = String(counts.todos||0);
    if (kAnd) kAnd.textContent = String(counts.andamento||0);
    if (kUrg) kUrg.textContent = String(counts.urgente||0);
  }

  function ensureSearchControls(col){
    var searchbar = q('.pedidos-searchbar-v18', col); if (!searchbar) return;
    var searchWrap = q('.lista-search', searchbar);
    var selectBtn = q('.v18-select-btn', searchbar);
    if (!selectBtn) {
      selectBtn = document.createElement('button');
      selectBtn.type = 'button'; selectBtn.className = 'v18-select-btn';
      selectBtn.innerHTML = '<i class="bx bx-check-square" aria-hidden="true"></i><span>Selecionar</span>';
      selectBtn.addEventListener('click', function(){
        var legacy = q('#btnSelecionarPedidos, .filter-btn#btnSelecionarPedidos, [onclick*="iniciarSelecaoPedidos"]', col);
        if (legacy) legacy.click(); else if (typeof window.iniciarSelecaoPedidos === 'function') window.iniciarSelecaoPedidos();
      });
      searchbar.insertBefore(selectBtn, searchbar.firstChild);
    }
    if (searchWrap && searchbar.firstElementChild !== selectBtn) searchbar.insertBefore(selectBtn, searchWrap);

    if (searchWrap) {
      var filterBtn = q('.v18-search-filter-btn', searchWrap);
      if (!filterBtn) {
        filterBtn = document.createElement('button'); filterBtn.type='button'; filterBtn.className='v18-search-filter-btn';
        filterBtn.setAttribute('aria-label','Abrir filtros'); filterBtn.innerHTML = '<i class="bx bx-slider-alt"></i>';
        searchWrap.appendChild(filterBtn);
      }
      filterBtn.onclick = function(ev){
        if (ev && ev.preventDefault) ev.preventDefault();
        var legacy = q('#toggleFilters, .filter-btn#toggleFilters, [onclick*="toggleListaFilters"]', col);
        if (legacy && legacy !== filterBtn) { legacy.click(); return; }
        if (typeof window.toggleListaFilters === 'function') { window.toggleListaFilters(ev || window.event); return; }
        var panel = q('#pedidosFiltersPanel', col);
        if (panel) panel.style.display = (getComputedStyle(panel).display === 'none') ? 'block' : 'none';
      };
    }
    qa('.pedidos-searchbar-v18 > .v18-filter-btn', searchbar).forEach(function(el){ el.style.display='none'; });
  }

  function fixStatusClickBinding(col){
    qa('.pedidos-status-chip-v18', col).forEach(function(btn){
      if (btn.dataset.v20Bound === '1') return; btn.dataset.v20Bound = '1';
      btn.addEventListener('click', function(){
        var st = (btn.getAttribute('data-status') || '').toLowerCase();
        var pf = st ? q('#pedidosFilters .pf-btn[data-status="'+st+'"]', col) : null;
        if (!pf && st === 'todos') pf = q('#pedidosFilters .pf-btn[data-status=""]', col);
        if (pf) pf.click();
        setTimeout(function(){ qa('.pedidos-status-chip-v18', col).forEach(function(b){ b.classList.remove('active'); }); btn.classList.add('active'); syncCounts(col); }, 60);
      });
    });
    if (!q('.pedidos-status-chip-v18.active', col)) {
      var todos = q('.pedidos-status-chip-v18[data-status="todos"]', col) || q('.pedidos-status-chip-v18', col);
      if (todos) todos.classList.add('active');
    }
  }

  function fixPedidosCardLayout(col){
    qa('#pedidosLista .item-pedido', col).forEach(function(card){
      card.style.background = '#fff';
      card.style.border = '1px solid #d9e5f5';
      card.style.borderRadius = '18px';
      card.style.boxShadow = '0 6px 18px rgba(13,38,76,.05)';
      var head = q('.ip-head', card), body = q('.ip-body', card), title = q('h4', card);
      if (head && window.innerWidth > 980) head.style.minHeight = '120px';
      if (title && window.innerWidth > 980) title.style.minHeight = '52px';
      if (body) body.style.marginTop = 'auto';
    });
  }

  function run(){
    try { if (typeof window.__pedidosV18Schedule === 'function') window.__pedidosV18Schedule(); } catch(e) {}
    try { if (typeof window.__pedidosV19Schedule === 'function') window.__pedidosV19Schedule(); } catch(e) {}
    var col = getCol(); if (!col) return;
    hideLegacyBlocks(col); ensureStatusChipLabels(col); dedupeHeroBadge(col); ensureSearchControls(col); fixStatusClickBinding(col); fixPedidosCardLayout(col); syncCounts(col);
  }

  var raf = null;
  function schedule(){ if (raf) cancelAnimationFrame(raf); raf = requestAnimationFrame(run); }
  document.addEventListener('DOMContentLoaded', schedule);
  window.addEventListener('load', schedule);
  window.addEventListener('resize', function(){ setTimeout(schedule, 30); });
  setTimeout(function(){
    var col = getCol();
    if (col) {
      new MutationObserver(function(){ schedule(); }).observe(col, { childList:true, subtree:true, attributes:true, attributeFilter:['class','style','hidden'] });
    }
    schedule();
  }, 80);
  window.__pedidosV20FinalHotfixRun = schedule;
})();
