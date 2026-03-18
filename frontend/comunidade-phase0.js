
(function(){
  function ensureHero(){
    const main = document.querySelector('main');
    if(!main) return;
    let hero = main.querySelector('.comm-hero-container');
    if(hero) {
      hero.style.display = '';
      return;
    }
    hero = document.createElement('section');
    hero.className = 'comm-hero-container';
    hero.innerHTML = '<div class="comm-header"><div class="comm-title"><h1>Comunidades</h1><p>Explore grupos locais, profissionais e interesses próximos em uma navegação mais previsível, com busca rápida e cards mais limpos.</p></div><div class="header-actions"><div class="search-bar-comm"><i class="bx bx-search"></i><input id="inputBuscaComm" placeholder="Buscar comunidades ou assuntos..." type="text"></div><button class="btn-create-comm" type="button" onclick="window.abrirModalCriarComm && window.abrirModalCriarComm()"><i class="bx bx-plus-circle"></i>Criar Grupo</button></div></div><section class="my-groups-section"><div class="section-label">Meus grupos</div><div class="groups-scroll" id="listaMeusGrupos"></div></section>';
    main.insertBefore(hero, main.firstChild);
  }

  function applySkeleton(){
    const list = document.getElementById('listaComunidades');
    if(!list) return;
    const hasCards = list.querySelector('.com-card,.card-comm,[data-comm-card]');
    if(hasCards) return;
    const txt = (list.textContent || '').toLowerCase();
    if(txt.includes('carregando')){
      list.innerHTML = '<div class="doke-comm-skeleton"><div class="doke-comm-skel-card"></div><div class="doke-comm-skel-card"></div></div>';
      return;
    }
    if(!list.children.length || txt.includes('nenhuma comunidade')){
      list.innerHTML = '<div class="comm-empty"><div><b>Nenhuma comunidade encontrada</b><span>Quando houver grupos disponíveis ou dados reais sincronizados, eles vão aparecer aqui.</span></div></div>';
    }
  }

  function normalizeCards(){
    const list = document.getElementById('listaComunidades');
    if(!list) return;
    list.querySelectorAll('.com-card, .card-comm').forEach((card)=>{
      card.setAttribute('data-comm-card','1');
    });
  }

  function boot(){
    ensureHero();
    applySkeleton();
    normalizeCards();
    const list = document.getElementById('listaComunidades');
    if(list){
      new MutationObserver(function(){ ensureHero(); normalizeCards(); applySkeleton(); }).observe(list,{childList:true,subtree:true});
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
