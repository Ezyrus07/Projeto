(function(){
  function skelGrid(count){
    return '<div class="comm-skeleton-grid">' + Array.from({length:count||4}).map(() => '<div class="comm-skel"><div class="comm-skel-cover"></div><div class="comm-skel-line"></div><div class="comm-skel-line short"></div><div class="comm-skel-line"></div></div>').join('') + '</div>';
  }
  function ensureHero(){
    const main = document.querySelector('main');
    if(!main) return;
    let hero = main.querySelector('.comm-hero-container');
    if(!hero){
      hero = document.createElement('section');
      hero.className = 'comm-hero-container';
      hero.innerHTML = '<div class="comm-header"><div class="comm-title"><h1>Comunidades</h1><p>Explore grupos locais, profissionais e interesses próximos com busca rápida e visual limpo.</p></div><div class="header-actions"><div class="search-bar-comm"><i class="bx bx-search"></i><input id="inputBuscaComm" type="text" placeholder="Buscar comunidades ou assuntos..."></div><button class="btn-create-comm" type="button"><i class="bx bx-plus-circle"></i> Criar Grupo</button></div></div><section class="my-groups-section"><div class="section-label">Meus grupos</div><div class="groups-scroll" id="listaMeusGrupos"></div></section>';
      const first = main.firstElementChild;
      if(first) main.insertBefore(hero, first); else main.appendChild(hero);
    }
    hero.hidden = false;
    hero.style.display = '';
    hero.style.visibility = 'visible';
    hero.style.opacity = '1';
    const search = hero.querySelector('#inputBuscaComm');
    if(search && !search.onkeyup && typeof window.filtrarComunidadesTela === 'function'){
      search.addEventListener('input', e => window.filtrarComunidadesTela(e.target.value));
    }
    const btn = hero.querySelector('.btn-create-comm');
    if(btn && !btn.__boundOpen){
      btn.__boundOpen = true;
      btn.addEventListener('click', () => { if(typeof window.abrirModalCriarComm === 'function') window.abrirModalCriarComm(); });
    }
  }
  function normalizeInlineStates(){
    const list = document.getElementById('listaComunidades');
    const my = document.getElementById('listaMeusGrupos');
    if(list){
      const txt = String(list.textContent || '').toLowerCase();
      if(/carregando comunidades/.test(txt) && !list.querySelector('.com-card,.card-comm')) list.innerHTML = skelGrid(4);
      if(/nenhuma comunidade encontrada/.test(txt) && !list.querySelector('.com-card,.card-comm')){
        list.innerHTML = '<div class="doke-inline-state">Nenhuma comunidade encontrada.</div>';
      }
    }
    if(my){
      const txt = String(my.textContent || '').toLowerCase();
      if(/carregando seus grupos/.test(txt) && !my.querySelector('.my-group-item')){
        my.innerHTML = '<div class="doke-inline-state" style="min-height:88px">Carregando seus grupos...</div>';
      }
    }
  }
  function observe(){
    const list = document.getElementById('listaComunidades');
    const my = document.getElementById('listaMeusGrupos');
    [list,my].forEach((node) => {
      if(!node || node.__commFixObserved) return;
      node.__commFixObserved = true;
      const mo = new MutationObserver(() => { ensureHero(); normalizeInlineStates(); });
      mo.observe(node, { childList:true, subtree:true });
    });
  }
  function init(){
    if(document.body) document.body.setAttribute('data-page','comunidade');
    ensureHero();
    normalizeInlineStates();
    observe();
    setTimeout(() => { ensureHero(); normalizeInlineStates(); }, 350);
    setTimeout(() => { ensureHero(); normalizeInlineStates(); }, 1200);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
