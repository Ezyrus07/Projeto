(function(){
  function ensureHero(){
    try{
      var hero=document.querySelector('.comm-hero-container');
      var main=document.querySelector('body[data-page="comunidade"] main');
      if(!main) return;
      if(!hero){
        var layout=main.querySelector('.comm-layout');
        hero=document.createElement('div');
        hero.className='comm-hero-container';
        hero.innerHTML='<div class="comm-header"><div class="comm-title"><h1>Comunidades</h1><p>Explore grupos locais, profissionais e interesses próximos em uma navegação mais leve e previsível.</p></div><div class="header-actions"><div class="search-bar-comm"><i class="bx bx-search"></i><input id="inputBuscaComm" onkeyup="filtrarComunidadesTela(this.value)" placeholder="Buscar comunidades ou assuntos..." type="text"></div><button class="btn-create-comm" onclick="abrirModalCriarComm()"><i class="bx bx-plus-circle"></i> Criar Grupo</button></div></div><section class="my-groups-section"><div class="section-label">Meus grupos</div><div class="groups-scroll" id="listaMeusGrupos"><div class="comm-skeleton-row"><div class="comm-skel-thumb"></div><div class="comm-skel-thumb"></div></div></div></section>';
        main.insertBefore(hero, layout || main.firstChild);
      }
      hero.hidden=false;
      hero.style.display='block';
      hero.style.visibility='visible';
      hero.style.opacity='1';
    }catch(_e){}
  }
  function normalizeListStates(){
    try{
      var list=document.getElementById('listaComunidades');
      if(list){
        var text=(list.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
        if(text.includes('carregando comunidades')){
          list.innerHTML='<div class="comm-skeleton-grid"><div class="comm-skel-card"></div><div class="comm-skel-card"></div></div>';
        } else if(text.includes('nenhuma comunidade encontrada') && !list.querySelector('.comm-empty')){
          list.innerHTML='<div class="comm-empty"><strong>Nenhuma comunidade encontrada.</strong><div>Não achei grupos antigos no Supabase nem no cache deste navegador.</div></div>';
        }
      }
    }catch(_e){}
  }
  function run(){ ensureHero(); normalizeListStates(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
  new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
})();