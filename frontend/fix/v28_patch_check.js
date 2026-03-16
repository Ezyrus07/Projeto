
(function(){
  'use strict';

  function q(sel, root){ return (root || document).querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function onReady(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once:true });
    else fn();
  }

  function safeText(el, txt){ if (el && el.textContent !== txt) el.textContent = txt; }

  function parseStatusText(card){
    var txt = (card && card.textContent || '').toLowerCase();
    if (txt.indexOf('urgente') !== -1) return 'urgente';
    if (txt.indexOf('finaliz') !== -1) return 'finalizado';
    if (txt.indexOf('andament') !== -1 || txt.indexOf('aceit') !== -1) return 'andamento';
    if (txt.indexOf('pendente') !== -1 || txt.indexOf('novo') !== -1 || txt.indexOf('aguard') !== -1) return 'pendente';
    return 'outro';
  }

  function getPedidoCards(){
    var selectors = ['.orcamento-card-item','.pedidos-lista .pedido-item','.pedidos-grid > *','[data-pedido-id]'];
    for (var i=0;i<selectors.length;i++){
      var list = qa(selectors[i]);
      if (list.length) return list;
    }
    return [];
  }

  function countPedidos(){
    var cards = getPedidoCards();
    var out = { total:0, pendente:0, andamento:0, urgente:0, finalizado:0 };
    if (!cards.length) return out;
    cards.forEach(function(card){
      var hidden = false;
      if (card.classList && card.classList.contains('hidden')) hidden = true;
      var cs = window.getComputedStyle(card);
      if (cs.display === 'none' || cs.visibility === 'hidden') hidden = true;
      if (hidden) return;
      out.total += 1;
      var st = parseStatusText(card);
      if (Object.prototype.hasOwnProperty.call(out, st)) out[st] += 1;
    });
    return out;
  }

  function ensureSingleHeroBadge(counts){
    var hero = q('.pedidos-hero, .pedidos-page-hero, .hero-pedidos, .banner-pedidos') || (q('h1') ? q('h1').closest('section,div') : null);
    if (!hero) return;
    var h1 = q('h1', hero) || q('.hero-title', hero);
    if (!h1) return;

    qa('.hero-count-badge, .pedidos-hero-badge, .badge-pedidos, .hero-badge', hero).forEach(function(el){
      if (el.id !== 'pedidosHeroBadge') el.remove();
    });

    var badge = q('#pedidosHeroBadge', hero);
    if (!badge){
      badge = document.createElement('span');
      badge.id = 'pedidosHeroBadge';
      h1.insertAdjacentElement('afterend', badge);
    }

    var value = counts.pendente;
    if (!value && counts.total && counts.andamento === 0 && counts.urgente === 0 && counts.finalizado === 0) value = counts.total;
    safeText(badge, String(value || 0));

    badge.style.display = 'inline-flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    badge.style.minWidth = '38px';
    badge.style.height = '38px';
    badge.style.padding = '0 10px';
    badge.style.marginLeft = '12px';
    badge.style.borderRadius = '999px';
    badge.style.background = '#ff3b78';
    badge.style.color = '#fff';
    badge.style.fontWeight = '800';
    badge.style.fontSize = '20px';
    badge.style.lineHeight = '1';
    badge.style.boxShadow = '0 8px 20px rgba(255,59,120,.25)';
    badge.style.verticalAlign = 'middle';

    var numerics = qa('span,div', hero).filter(function(el){ return el !== badge && /^\d+$/.test((el.textContent||'').trim()); });
    numerics.forEach(function(el){
      if (el.getBoundingClientRect && badge.getBoundingClientRect) {
        var r = el.getBoundingClientRect(), b = badge.getBoundingClientRect();
        var overlap = !(r.right < b.left || r.left > b.right || r.bottom < b.top || r.top > b.bottom);
        if (overlap) el.remove();
      }
    });
  }

  function normalizeFilterRow(){
    var toolbar = q('.pedidos-toolbar, .pedidos-top-controls, .pedidos-filtros-topo, .filtros-pedidos-row');
    if (!toolbar) return;
    toolbar.style.display = 'flex';
    toolbar.style.alignItems = 'center';
    toolbar.style.gap = '15px';
    toolbar.style.flexWrap = 'wrap';

    var statusRow = q('.status-filters-row, .pedidos-status-filters, .pedidos-pro-chips, .pedidos-summary-filters', toolbar) || q('.status-filters-row, .pedidos-status-filters, .pedidos-pro-chips, .pedidos-summary-filters');
    if (statusRow){
      statusRow.style.display = 'grid';
      statusRow.style.gridTemplateColumns = 'repeat(4, minmax(120px, 1fr))';
      statusRow.style.gap = '12px';
      statusRow.style.flex = '1 1 520px';
      statusRow.style.minWidth = '0';
      qa('.status-filter-card-v23, .status-card, .pro-chip, .pedido-kpi-card', statusRow).forEach(function(c){
        c.style.minWidth = '0';
        c.style.height = '76px';
        c.style.display = 'flex';
        c.style.alignItems = 'center';
        c.style.justifyContent = 'space-between';
        c.style.padding = '0 18px';
        c.style.overflow = 'hidden';
      });
    }

    var btnSel = q('#btnSelecionarPedidos, .btn-selecionar-pedidos', toolbar) || q('#btnSelecionarPedidos, .btn-selecionar-pedidos');
    if (btnSel){
      btnSel.style.marginLeft = '15px';
      btnSel.style.marginRight = '15px';
      btnSel.style.flex = '0 0 auto';
    }

    var searchWrap = q('.pedidos-searchbar, .lista-search, .search-input-group, .pedido-search-wrap', toolbar) || q('.pedidos-searchbar, .lista-search, .search-input-group, .pedido-search-wrap');
    var input = q('#inputBuscaLista, input[type="search"], .pedidos-searchbar input', searchWrap || toolbar || document);
    if (searchWrap){
      searchWrap.style.flex = '2 1 340px';
      searchWrap.style.minWidth = '280px';
      searchWrap.style.position = 'relative';
    }
    if (input){
      input.style.width = '100%';
      input.style.paddingLeft = '44px';
      input.style.paddingRight = '56px';
      input.style.boxSizing = 'border-box';
    }
    var icon = q('.bx-search, .fa-search, [data-search-icon]', searchWrap || toolbar || document);
    if (icon && searchWrap){
      icon.style.position = 'absolute';
      icon.style.left = '14px';
      icon.style.top = '50%';
      icon.style.transform = 'translateY(-50%)';
      icon.style.pointerEvents = 'none';
      icon.style.zIndex = '2';
    }
  }

  function stylePedidosGrid(){
    var cards = getPedidoCards();
    cards.forEach(function(card){
      if (!card) return;
      if (!card.dataset.pedidosUiFixed){
        card.dataset.pedidosUiFixed = '1';
        card.style.background = '#fff';
        card.style.borderRadius = '12px';
        card.style.boxShadow = '0 1px 0 rgba(10,35,66,.03), 0 8px 22px rgba(10,35,66,.04)';
        card.style.padding = card.style.padding || '18px';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '12px';
        card.style.height = '100%';
      }
      var title = q('.pedido-title, .orcamento-titulo, .titulo-pedido, h3, .pedido-card-title', card);
      if (title){
        title.style.minHeight = '52px';
        title.style.display = 'flex';
        title.style.alignItems = 'center';
        title.style.justifyContent = 'center';
        title.style.textAlign = 'center';
      }
      var inner = q('.pedido-status-box, .pedido-andamento-box, .pedido-inner-card, .pedido-resumo-box', card);
      if (inner){ inner.style.marginTop = 'auto'; }
    });
  }

  var scheduled = false;
  function applyAll(){
    try {
      var counts = countPedidos();
      ensureSingleHeroBadge(counts);
      normalizeFilterRow();
      stylePedidosGrid();
    } catch (err) {
      console.error('[pedidos-v28-hardfix] erro:', err);
    }
  }
  function scheduleApply(){
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function(){
      scheduled = false;
      applyAll();
    });
  }

  onReady(function(){
    applyAll();
    var attempts = 0;
    var timer = setInterval(function(){
      attempts++;
      applyAll();
      if (attempts >= 10) clearInterval(timer);
    }, 500);

    if (window.MutationObserver){
      var root = q('.pedidos-page, main, body');
      if (root){
        var mo = new MutationObserver(function(muts){
          for (var i=0;i<muts.length;i++){
            if (muts[i].type === 'childList') { scheduleApply(); return; }
          }
        });
        mo.observe(root, { childList:true, subtree:true });
      }
    }
  });
})();
