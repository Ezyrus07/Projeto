
(function(){
  if (window.__pedidosRescueV10Loaded) return;
  window.__pedidosRescueV10Loaded = true;

  function qs(sel, root){ return (root || document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function byId(id){ return document.getElementById(id); }
  function safe(fn){ try{ fn(); }catch(e){} }

  function currentView(){
    if (typeof window.listaView === 'string' && window.listaView) return window.listaView;
    var agenda = byId('agendaPanel');
    if (agenda && agenda.style.display !== 'none' && getComputedStyle(agenda).display !== 'none') return 'agenda';
    return 'lista';
  }

  function syncViewClasses(){
    if (!document.body || !document.body.classList.contains('page-pedidos')) return;
    var view = currentView();
    document.body.classList.toggle('pedidos-view-agenda', view === 'agenda');
    document.body.classList.toggle('pedidos-view-lista', view !== 'agenda');
  }

  function closeFilters(){
    var panel = byId('listaFiltersPanel');
    var btn = byId('toggleFilters');
    if (panel) panel.classList.remove('open');
    if (btn){
      btn.classList.remove('is-open');
      btn.setAttribute('aria-expanded','false');
    }
    var shell = qs('.coluna-lista.pedidos-ux .pedidos-controls-shell');
    if (shell) shell.classList.remove('show-advanced');
  }

  function ensureAgendaCloseButton(){
    var top = qs('#agendaPanel .agenda-top');
    if (!top) return;
    var btn = qs('.agenda-close-lista', top);
    if (!btn){
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'agenda-close-lista';
      btn.innerHTML = "<i class='bx bx-list-ul'></i><span>Lista</span>";
      top.appendChild(btn);
    }
    if (!btn.dataset.boundV10){
      btn.dataset.boundV10 = '1';
      btn.addEventListener('click', function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        safe(function(){
          if (typeof window.trocarViewLista === 'function') window.trocarViewLista('lista');
        });
        setTimeout(syncViewClasses, 0);
      }, true);
    }
  }

  function stabilizeLayout(){
    var shell = qs('.coluna-lista.pedidos-ux > .pedidos-controls-shell');
    var quick = qs('.lista-quick', shell);
    var search = qs('.lista-search', quick);
    var actions = qs('.pedidos-quick-actions', quick);

    if (shell && search && actions && quick){
      // garante ordem consistente
      if (search.parentNode !== quick) quick.insertBefore(search, quick.firstChild);
      if (actions.parentNode !== quick) quick.appendChild(actions);
      // evita nós estranhos que scripts antigos possam empurrar para cima
      qsa('.lista-search', quick).forEach(function(el, idx){
        if (idx > 0 && el.parentNode) el.parentNode.removeChild(el);
      });
    }
  }

  function bindAgendaTriggersAsToggle(){
    // captura antes dos handlers antigos
    qsa('[data-pedidos-action="agenda"], #listaViewToggle .pf-btn[data-view="agenda"]').forEach(function(btn){
      if (btn.dataset.v10AgendaToggleBound === '1') return;
      btn.dataset.v10AgendaToggleBound = '1';
      btn.addEventListener('click', function(ev){
        if (!document.body || !document.body.classList.contains('page-pedidos')) return;
        var isAgenda = currentView() === 'agenda';
        // se clicar novamente em Agenda, volta para lista
        if (isAgenda){
          ev.preventDefault();
          ev.stopPropagation();
          if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
          safe(function(){ if (typeof window.trocarViewLista === 'function') window.trocarViewLista('lista'); });
          closeFilters();
          setTimeout(syncViewClasses, 0);
          return false;
        }
        // abrindo agenda -> fecha filtros para evitar overlap
        closeFilters();
        setTimeout(syncViewClasses, 0);
      }, true);
    });
  }

  function wrapTrocarViewLista(){
    if (window.__pedidosV10WrappedTrocar) return;
    if (typeof window.trocarViewLista !== 'function') return;
    var orig = window.trocarViewLista;
    window.trocarViewLista = function(view){
      var result = orig.apply(this, arguments);
      safe(function(){
        if (String(view || 'lista') === 'agenda'){
          closeFilters();
        }
        ensureAgendaCloseButton();
        syncViewClasses();
      });
      return result;
    };
    window.__pedidosV10WrappedTrocar = true;
    syncViewClasses();
  }

  function wrapToggleListaFilters(){
    if (window.__pedidosV10WrappedFilters) return;
    if (typeof window.toggleListaFilters !== 'function') return;
    var orig = window.toggleListaFilters;
    window.toggleListaFilters = function(ev){
      var r = orig.apply(this, arguments);
      safe(function(){
        var panel = byId('listaFiltersPanel');
        var btn = byId('toggleFilters');
        var open = !!(panel && panel.classList.contains('open'));
        if (btn){
          btn.classList.toggle('is-open', open);
          btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
        // em agenda, manter filtros fechados para não quebrar layout do calendário
        if (currentView() === 'agenda' && panel){
          panel.classList.remove('open');
          if (btn){
            btn.classList.remove('is-open');
            btn.setAttribute('aria-expanded', 'false');
          }
        }
        syncViewClasses();
      });
      return r;
    };
    window.__pedidosV10WrappedFilters = true;
  }

  function ensureSearchBelowHeroOnMobile(){
    var page = qs('.coluna-lista.pedidos-ux');
    if (!page) return;
    var header = qs(':scope > .lista-header', page) || qs('.lista-header', page);
    var top = qs('.lista-top', header);
    var hero = qs('.pedidos-hero-banner', top || header);
    var shell = qs(':scope > .pedidos-controls-shell', page) || qs('.pedidos-controls-shell', page);
    if (!header || !shell) return;
    var mobile = window.matchMedia('(max-width: 700px)').matches;
    if (mobile && top){
      if (shell.parentNode !== top){
        if (hero && hero.nextSibling) top.insertBefore(shell, hero.nextSibling);
        else top.appendChild(shell);
      } else if (hero && shell.previousElementSibling !== hero){
        if (hero.nextSibling) top.insertBefore(shell, hero.nextSibling);
        else top.appendChild(shell);
      }
    } else {
      if (shell.parentNode !== page){
        page.insertBefore(shell, qs(':scope > .lista-scroll#lista-pedidos', page) || qs('#lista-pedidos', page));
      }
    }
  }

  function boot(){
    safe(wrapTrocarViewLista);
    safe(wrapToggleListaFilters);
    safe(ensureAgendaCloseButton);
    safe(bindAgendaTriggersAsToggle);
    safe(stabilizeLayout);
    safe(ensureSearchBelowHeroOnMobile);
    safe(syncViewClasses);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.addEventListener('load', function(){
    setTimeout(boot, 80);
    setTimeout(boot, 350);
    setTimeout(boot, 900);
  });
  window.addEventListener('resize', function(){
    clearTimeout(window.__pedidosV10ResizeTimer);
    window.__pedidosV10ResizeTimer = setTimeout(function(){
      boot();
    }, 80);
  });

  if (!document.documentElement.__pedidosRescueV10MO){
    var mo = new MutationObserver(function(){
      boot();
    });
    mo.observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['style','class']});
    document.documentElement.__pedidosRescueV10MO = mo;
  }
})();
