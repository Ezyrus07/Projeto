
(function(){
  function q(s,r=document){return r.querySelector(s)}
  function qa(s,r=document){return Array.from(r.querySelectorAll(s))}
  function ensureHero(){
    const main=q('main'); if(!main) return;
    let hero=q('.comm-hero-container',main);
    let layout=q('.comm-layout',main);
    if(!hero){
      hero=document.createElement('div');
      hero.className='comm-hero-container';
      hero.innerHTML=`<div class="comm-header"><div class="comm-title"><h1>Comunidades</h1><p>Explore grupos locais, profissionais e interesses próximos em uma navegação mais previsível, com busca rápida e cards mais limpos.</p></div><div class="header-actions"><div class="search-bar-comm"><i class='bx bx-search'></i><input id="inputBuscaComm" type="text" placeholder="Buscar comunidades ou assuntos..."></div><button class="btn-create-comm" type="button"><i class='bx bx-plus-circle'></i>Criar grupo</button></div></div><section class="my-groups-section"><div class="section-label">Meus grupos</div><div class="groups-scroll" id="listaMeusGrupos"></div></section>`;
      if(main.firstChild) main.insertBefore(hero, main.firstChild); else main.appendChild(hero);
    }
    if(!layout){
      layout=document.createElement('div'); layout.className='comm-layout';
      layout.innerHTML='<div class="main-feed-comm"><div class="comm-filter-nav"><button class="chips-arrow comm-filter-arrow left" type="button"><i class="bx bx-chevron-left"></i></button><div class="filter-tabs" id="commFilterTabs"><button class="tab-btn active">Todos</button><button class="tab-btn">Em alta</button><button class="tab-btn">Perto de você</button><button class="tab-btn">Novos</button><button class="tab-btn">Profissionais</button><button class="tab-btn">Condomínios</button><button class="tab-btn">Hobbies</button></div><button class="chips-arrow comm-filter-arrow right" type="button"><i class="bx bx-chevron-right"></i></button></div><div id="listaComunidades"></div></div>';
      main.appendChild(layout)
    }
  }
  function ensureSkeleton(){
    const list=q('#listaComunidades'); if(!list) return;
    const txt=(list.textContent||'').toLowerCase();
    if(!list.children.length || txt.includes('carregando comunidades')){
      list.innerHTML=`<div class="comm-skeleton"><div class="comm-skel-card"></div><div class="comm-skel-card"></div></div>`;
    }
    const my=q('#listaMeusGrupos');
    if(my && !my.children.length){
      my.innerHTML='<div class="my-group-item"><img alt="" src="assets/Imagens/user_placeholder.png"><span>Grupo</span></div>';
    }
  }
  function wireSearch(){const inp=q('#inputBuscaComm'); if(!inp||inp.__wired)return; inp.__wired=true; inp.addEventListener('input',()=>{const term=inp.value.toLowerCase(); qa('#listaComunidades .com-card, #listaComunidades .card-comm, #listaComunidades > div').forEach(card=>{const t=(card.textContent||'').toLowerCase(); card.style.display=t.includes(term)?'':'none';});});}
  function normalizeCards(){
    const list=q('#listaComunidades'); if(!list) return;
    qa('#listaComunidades > .doke-inline-loader').forEach(el=>el.remove());
    qa('#listaComunidades > *', list).forEach(card=>{
      if(card.classList.contains('comm-skeleton')||card.classList.contains('comm-empty-state')) return;
      if(!card.classList.contains('com-card')&&!card.classList.contains('card-comm')) card.classList.add('card-comm');
    });
    if(!qa('#listaComunidades .com-card, #listaComunidades .card-comm').length){
      list.innerHTML='<div class="comm-empty-state"><h3>Nenhuma comunidade encontrada</h3><p>Crie um grupo ou ajuste os filtros para encontrar a comunidade ideal.</p></div>';
    }
  }
  const boot=()=>{ensureHero(); ensureSkeleton(); wireSearch(); setTimeout(normalizeCards,200);};
  document.addEventListener('DOMContentLoaded',boot); window.addEventListener('load',boot); setInterval(()=>{ensureHero(); wireSearch();},1500);
})();
