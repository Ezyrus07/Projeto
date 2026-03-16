(function(){
  function isHomeMobile(){
    return document.body && document.body.dataset && document.body.dataset.page === 'home' && window.innerWidth <= 768;
  }

  function removeProblematicBlocks(){
    if(!isHomeMobile()) return;
    ['paraVoceSection','pvQuickSearchSection'].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.remove();
    });
    document.querySelectorAll('.para-voce-section, .pv-inline-search-section, .pv-inline-search').forEach(function(el){
      el.remove();
    });
  }

  function normalizeFilters(){
    if(!isHomeMobile()) return;
    var container = document.querySelector('.filtros-container-premium');
    if(!container) return;
    container.style.position = 'static';
    container.style.transform = 'none';
    container.style.marginTop = '10px';
    container.style.zIndex = '1';
  }


  function compactExpandedFilters(){
    if(!isHomeMobile()) return;
    var panel = document.querySelector('.filtros-expandidos');
    if(panel){
      panel.style.maxHeight = 'none';
      panel.style.overflow = 'visible';
      panel.querySelectorAll('.filtro-group, .form-group, .field, .advanced-field').forEach(function(el){
        var hasControl = el.querySelector('input, select, button, .chip-tag, .switch, .toggle, label');
        var txt = (el.textContent || '').replace(/\s+/g,' ').trim();
        if(!hasControl && txt.length <= 2){
          el.style.display = 'none';
        }
      });
    }

    document.querySelectorAll('.skeleton-card, .card-skeleton, .pros-skeleton-card, .skeleton-anuncio, .skeleton-profissional').forEach(function(el, idx){
      if(idx > 2) el.style.display = 'none';
    });
  }

  function softenShellWhileHomeLoads(){
    if(!isHomeMobile()) return;
    document.documentElement.classList.add('doke-home-mobile-fix');
    window.setTimeout(function(){
      document.documentElement.classList.remove('doke-home-mobile-fix');
    }, 1400);
  }


  function run(){
    removeProblematicBlocks();
    normalizeFilters();
    compactExpandedFilters();
    softenShellWhileHomeLoads();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', run, {once:true});
  } else {
    run();
  }

  window.addEventListener('resize', function(){
    if(window.innerWidth <= 768) run();
  }, {passive:true});
})();
