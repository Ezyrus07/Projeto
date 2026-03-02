
(function(){
  if(!(document.body && (document.body.classList.contains('page-pedidos') || document.body.dataset.page==='chat'))) return;
  var $ = function(s,r){ return (r||document).querySelector(s); };
  var $$ = function(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
  var norm = function(t){ return (t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); };

  function getCol(){ return $('.coluna-lista.pedidos-ux') || document; }
  function getToolbar(col){ return $('.pedidos-toolbar-v20', col) || $('.pedidos-lista-wrap-v20', col); }
  function getList(col){ return $('.pedidos-list-v18', col) || $('.lista-pedidos', col); }

  function visible(el){ return !!(el && el.offsetParent !== null && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden'); }

  function removeDuplicateHeroBadges(col, total){
    var row = $('.pedidos-hero-v12__titleRow', col) || $('.pedidos-hero-v12__titleRow');
    if(!row) return;
    var candidates = $$('.pedidos-hero-v12__badge, .badge', row).filter(function(el){ return /\d/.test((el.textContent||'')); });
    if(!candidates.length) return;
    var keep = $('#pedidosHeroBadge', row) || candidates[0];
    if(!keep.classList.contains('pedidos-hero-v12__badge')) keep.classList.add('pedidos-hero-v12__badge');
    if(!keep.id) keep.id = 'pedidosHeroBadge';
    candidates.forEach(function(el){ if(el !== keep) el.remove(); });
    if(Number.isFinite(total)) keep.textContent = String(total);
  }

  function hideLegacyStatusBlocks(col){
    $$('.pedidos-pro-stats, .pedidos-kpi-wrap-v12, .pedidos-kpis-inline-v17, .pedidos-mini-kpis-v17, #listaViewToggle', col)
      .forEach(function(el){
        if(el.closest('.pedidos-toolbar-v20')) return;
        if(el.classList.contains('pedidos-status-strip-v18')) return;
        el.style.display='none';
      });
  }

  function ensureToolbarStructure(col){
    var toolbar = $('.pedidos-toolbar-v20', col);
    if(!toolbar) return;
    var row = $('.pedidos-statusbar-v20', toolbar) || toolbar;
    var strip = $('.pedidos-status-strip-v18', row) || $('.pedidos-status-strip-v18', toolbar);
    var selectBtn = $('.filter-btn-v18[data-action="select"]', row) || $('.filter-btn-v18[data-action="select"]', toolbar);
    var search = $('.lista-search-v18', row) || $('.lista-search-v18', toolbar);

    if(strip && row.firstElementChild !== strip) row.insertBefore(strip, row.firstElementChild || null);
    if(selectBtn && strip && selectBtn.previousElementSibling !== strip) row.insertBefore(selectBtn, strip.nextSibling);
    if(search) row.appendChild(search);

    if(search){
      search.classList.add('has-filter-inside-v22');
      search.style.position='relative';
      var input = $('input', search);
      var icon = $('.bx-search', search);
      if(icon && icon.parentElement !== search) search.insertBefore(icon, search.firstChild);
      if(input){
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('inputmode', 'search');
      }
      var filterBtn = $('.filter-icon-btn-v18', search);
      if(!filterBtn){
        filterBtn = document.createElement('button');
        filterBtn.type = 'button';
        filterBtn.className = 'filter-icon-btn-v18';
        filterBtn.setAttribute('aria-label','Abrir filtros');
        filterBtn.innerHTML = '<i class="bx bx-slider-alt"></i>';
        search.appendChild(filterBtn);
      }
      var hiddenFilter = $('#toggleFilters', col) || $('.filter-btn-v18[data-action="toggle-filters"]', toolbar) || $('#toggleFilters');
      if(filterBtn && !filterBtn.dataset.boundV22){
        filterBtn.dataset.boundV22='1';
        filterBtn.addEventListener('click', function(ev){
          ev.preventDefault();
          if(hiddenFilter) hiddenFilter.click();
          else if(typeof window.toggleListaFiltros === 'function') window.toggleListaFiltros(ev);
        });
      }
    }
  }

  function getItems(col){
    var list = getList(col);
    if(!list) return [];
    return $$('.item-pedido', list);
  }

  function classifyItem(item){
    var st = norm((($('.ip-status', item)||{}).textContent) || '');
    var badge = norm((($('.ip-pill', item)||{}).textContent) || '');
    var all = (st + ' ' + badge).trim();
    var urg = item.classList.contains('urgente') || item.dataset.urgente === '1' || /urgente/.test(all);
    var fin = /finaliz|conclu|entregue|feito/.test(all);
    var andamento = /andamento|andando|progresso|execu/.test(all);
    return { urg: urg, fin: fin, andamento: andamento, allText: all };
  }

  function computeCounts(col){
    var items = getItems(col);
    var allVisible = items.filter(visible);
    // usar todos os itens em DOM para consistência dos contadores globais
    var base = items.length ? items : allVisible;
    var counts = { todos: 0, andamento: 0, urgentes: 0, finalizados: 0 };
    base.forEach(function(item){
      var c = classifyItem(item);
      counts.todos += 1;
      if(c.andamento && !c.fin) counts.andamento += 1;
      if(c.urg) counts.urgentes += 1;
      if(c.fin) counts.finalizados += 1;
    });
    if(counts.andamento === 0 && counts.todos > 0 && counts.finalizados === 0){
      counts.andamento = counts.todos; // fallback visual quando todos os cards estão em andamento e o texto varia
    }
    counts.ativos = Math.max(0, counts.todos - counts.finalizados);
    return counts;
  }

  function applyCountsToChips(col, counts){
    var strip = $('.pedidos-status-strip-v18', col);
    if(!strip) return;
    var map = { todos:'Todos', andamento:'Em andamento', urgente:'Urgentes', finalizado:'Finalizados' };
    $$('.pedidos-status-chip-v18', strip).forEach(function(chip, idx){
      var labelEl = $('.pedidos-status-chip-v18__label', chip);
      var valueEl = $('.pedidos-status-chip-v18__value', chip);
      var status = chip.dataset.status || '';
      if(!status && labelEl) status = norm(labelEl.textContent);
      if(!status){ status = ['todos','andamento','urgente','finalizado'][idx] || 'todos'; }
      status = norm(status);
      if(status === 'em andamento') status = 'andamento';
      if(status.indexOf('urg') === 0) status = 'urgente';
      if(status.indexOf('final') === 0) status = 'finalizado';
      if(status.indexOf('todo') === 0) status = 'todos';
      chip.dataset.status = status;
      if(labelEl) labelEl.textContent = map[status] || labelEl.textContent || 'Status';
      if(valueEl){
        var v = status === 'todos' ? counts.todos : status === 'andamento' ? counts.andamento : status === 'urgente' ? counts.urgentes : counts.finalizados;
        valueEl.textContent = String(v || 0);
      }
    });
  }

  function syncHeroBadge(col, counts){
    removeDuplicateHeroBadges(col, counts.ativos);
  }

  function wireChipActiveState(col){
    var strip = $('.pedidos-status-strip-v18', col);
    if(!strip) return;
    var chips = $$('.pedidos-status-chip-v18', strip);
    if(!chips.length) return;
    function setActive(target){
      chips.forEach(function(c){ c.classList.toggle('is-active-v22', c===target); c.setAttribute('aria-pressed', c===target ? 'true' : 'false'); });
    }
    // inicial: detectar o que já está marcado por classes antigas
    var active = chips.find(function(c){ return c.classList.contains('is-selected') || c.classList.contains('active') || c.getAttribute('aria-pressed')==='true'; }) || chips[0];
    if(active) setActive(active);
    chips.forEach(function(chip){
      if(chip.dataset.v22ClickBound) return;
      chip.dataset.v22ClickBound = '1';
      chip.addEventListener('click', function(){
        setActive(chip);
        setTimeout(runSync, 60);
        setTimeout(runSync, 220);
      }, true);
    });
  }

  function fixOrderCardsLayout(col){
    var list = getList(col);
    if(!list) return;
    list.classList.add('pedidos-list-v18');
    getItems(col).forEach(function(item){
      item.style.background = '#fff';
      item.style.position = 'relative';
      var body = $('.ip-body', item);
      var title = body && $('h4', body);
      if(title) title.style.minHeight = window.innerWidth <= 768 ? '0' : '2.9em';
      var andamento = $('.ip-andamento', item);
      if(andamento) andamento.style.marginTop = 'auto';
    });
  }

  function removeGhostCounts(col){
    // remove qualquer badge rosa extra renderizada por versões anteriores
    var row = $('.pedidos-hero-v12__titleRow', col) || $('.pedidos-hero-v12__titleRow');
    if(!row) return;
    var badges = $$('.pedidos-hero-v12__badge, .badge', row).filter(function(el){ return /\d/.test(el.textContent||''); });
    if(badges.length <= 1) return;
    var keep = $('#pedidosHeroBadge', row) || badges[0];
    badges.forEach(function(b){ if(b !== keep) b.remove(); });
  }

  function runSync(){
    var col = getCol();
    if(!col) return;
    hideLegacyStatusBlocks(col);
    ensureToolbarStructure(col);
    wireChipActiveState(col);
    fixOrderCardsLayout(col);
    var counts = computeCounts(col);
    applyCountsToChips(col, counts);
    syncHeroBadge(col, counts);
    removeGhostCounts(col);
  }

  var mo;
  function boot(){
    runSync();
    if(mo) mo.disconnect();
    var col = getCol();
    if(col){
      mo = new MutationObserver(function(){ runSync(); });
      mo.observe(col, { childList:true, subtree:true, characterData:true });
    }
    window.addEventListener('resize', runSync, { passive:true });
    setTimeout(runSync, 300);
    setTimeout(runSync, 1200);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
