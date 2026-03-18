(function(){
  function skeletonMarkup(count){
    return `<div class="comm-skeleton-grid">${new Array(count).fill('<div class="comm-skel"></div>').join('')}</div>`;
  }
  function ensureHero(){
    const main = document.querySelector('main');
    if(!main) return;
    let hero = main.querySelector('.comm-hero-container');
    if(!(hero instanceof HTMLElement)){
      hero = document.createElement('section');
      hero.className = 'comm-hero-container';
      hero.innerHTML = `
        <div class="comm-header">
          <div class="comm-title">
            <h1>Comunidades</h1>
            <p>Explore grupos locais, profissionais e interesses próximos em uma navegação mais previsível, com busca rápida e cards mais limpos.</p>
          </div>
          <div class="header-actions">
            <div class="search-bar-comm"><i class="bx bx-search"></i><input id="inputBuscaComm" type="text" placeholder="Buscar comunidades ou assuntos..."></div>
            <button class="btn-create-comm" type="button"><i class="bx bx-plus-circle"></i> Criar Grupo</button>
          </div>
        </div>
        <section class="my-groups-section">
          <div class="section-label">Meus grupos</div>
          <div class="groups-scroll" id="listaMeusGrupos"></div>
        </section>`;
      const first = main.firstElementChild;
      if(first) main.insertBefore(hero, first); else main.appendChild(hero);
    }
    hero.hidden = false;
    hero.style.display = 'block';
    hero.style.visibility = 'visible';
    hero.style.opacity = '1';
    const title = hero.querySelector('h1'); if(title) title.textContent = 'Comunidades';
    const p = hero.querySelector('.comm-title p'); if(p && !p.textContent.trim()) p.textContent = 'Explore grupos locais, profissionais e interesses próximos em uma navegação mais previsível, com busca rápida e cards mais limpos.';
    const label = hero.querySelector('.section-label'); if(label) label.textContent = 'Meus grupos';
  }
  function ensureSkeletons(){
    const list = document.getElementById('listaComunidades');
    if(list && !list.querySelector('.card-comm,.com-card,.fallback-card,.comm-empty-state')){
      const text = (list.textContent || '').toLowerCase();
      if(text.includes('carregando') || !list.children.length) list.innerHTML = skeletonMarkup(4);
    }
    const my = document.getElementById('listaMeusGrupos');
    if(my && !my.querySelector('.my-group-item')){
      const text = (my.textContent || '').toLowerCase();
      if(text.includes('carregando') || !my.children.length){
        my.innerHTML = `<div class="my-group-item"><div class="group-img-ring"><img alt="" src="assets/Imagens/doke-logo.png"></div><span>Grupo</span></div>`;
      }
    }
  }
  function styleEmptyState(){
    const list = document.getElementById('listaComunidades');
    if(!list) return;
    const cards = list.querySelector('.card-comm,.com-card,.fallback-card');
    if(cards) return;
    const txt = (list.textContent || '').toLowerCase();
    if(txt.includes('nenhuma comunidade') || txt.includes('não achei grupos')){
      list.innerHTML = `<div class="comm-empty-state"><i class="bx bx-group" style="font-size:40px;color:#2d5f95"></i><b>Nenhuma comunidade encontrada</b><span>Não achei grupos antigos no Supabase nem no cache deste navegador. Se eles estiverem em outra conta, outro navegador ou dispositivo, não tenho como recuperar daqui.</span></div>`;
    }
  }
  function bindCreateBtn(){
    document.querySelectorAll('.btn-create-comm').forEach((btn)=>{
      btn.onclick = function(){ if(typeof window.abrirModalCriarComm==='function') window.abrirModalCriarComm(); };
    });
  }
  function run(){ ensureHero(); ensureSkeletons(); styleEmptyState(); bindCreateBtn(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, {once:true}); else run();
  setTimeout(run, 250);
  setTimeout(run, 1200);
})();
